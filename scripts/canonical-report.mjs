import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VOLATILE_KEYS = [
  "timestamp",
  "generatedAt",
  "createdAt",
  "outputPath",
  "path",
  "machine",
  "instanceId",
  "instanceID",
];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeNumber = (value) => {
  if (Object.is(value, -0) || value === 0) return 0;
  if (!Number.isFinite(value) || Number.isInteger(value)) return value;
  return Number(value.toFixed(6));
};

const findingSortValue = (finding) => {
  const candidate = finding ?? {};
  const severity = String(candidate.severity ?? "");
  const code = String(candidate.code ?? "");
  const primary = String(
    candidate.primary ?? candidate.primaryPlacementId ?? "",
  );
  const secondary = String(
    candidate.secondary ?? candidate.secondaryPlacementId ?? "",
  );
  const message = String(candidate.message ?? "");
  return [severity, code, primary, secondary, message];
};

const sortEntries = (entries) =>
  entries.sort(([left], [right]) => left.localeCompare(right));

export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([key]) => !VOLATILE_KEYS.includes(key))
      .map(([key, nestedValue]) => {
        let normalized = canonicalize(nestedValue);
        if (
          (key === "findings" || key === "validationFindings") &&
          Array.isArray(normalized)
        ) {
          normalized = [...normalized].sort((left, right) => {
            const leftValues = findingSortValue(left);
            const rightValues = findingSortValue(right);
            for (let index = 0; index < leftValues.length; index += 1) {
              const comparison = String(leftValues[index]).localeCompare(
                String(rightValues[index]),
              );
              if (comparison !== 0) return comparison;
            }
            return 0;
          });
        }
        return [key, normalized];
      });

    return Object.fromEntries(sortEntries(entries));
  }

  if (typeof value === "number") {
    return normalizeNumber(value);
  }

  return value;
}

export function stringifyCanonical(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function semanticDiff(a, b) {
  const left = canonicalize(a);
  const right = canonicalize(b);
  const differences = [];

  const walk = (leftValue, rightValue, path) => {
    if (Object.is(leftValue, rightValue)) {
      return;
    }

    if (leftValue === undefined || rightValue === undefined) {
      differences.push({ path, a: leftValue, b: rightValue });
      return;
    }

    const leftType = Array.isArray(leftValue)
      ? "array"
      : isPlainObject(leftValue)
        ? "object"
        : typeof leftValue;
    const rightType = Array.isArray(rightValue)
      ? "array"
      : isPlainObject(rightValue)
        ? "object"
        : typeof rightValue;

    if (leftType !== rightType) {
      differences.push({ path, a: leftValue, b: rightValue });
      return;
    }

    if (Array.isArray(leftValue)) {
      if (leftValue.length !== rightValue.length) {
        differences.push({ path, a: leftValue, b: rightValue });
        return;
      }

      leftValue.forEach((item, index) => {
        walk(item, rightValue[index], `${path}/${index}`);
      });
      return;
    }

    if (isPlainObject(leftValue)) {
      const keys = new Set([
        ...Object.keys(leftValue),
        ...Object.keys(rightValue),
      ]);
      for (const key of [...keys].sort()) {
        walk(leftValue[key], rightValue[key], `${path}/${key}`);
      }
      return;
    }

    differences.push({ path, a: leftValue, b: rightValue });
  };

  walk(left, right, "");
  return differences;
}

const formatCell = (value) => {
  if (value === undefined) return "undefined";
  if (typeof value === "string")
    return JSON.stringify(value).replace(/\|/g, "\\|");
  if (typeof value === "number") return String(value);
  return JSON.stringify(value).replace(/\|/g, "\\|");
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const [, , leftPath, rightPath] = process.argv;

  if (!leftPath || !rightPath) {
    console.error("Usage: node scripts/canonical-report.mjs <a.json> <b.json>");
    process.exit(2);
  }

  try {
    const left = JSON.parse(
      readFileSync(leftPath, "utf8").replace(/^\uFEFF/, ""),
    );
    const right = JSON.parse(
      readFileSync(rightPath, "utf8").replace(/^\uFEFF/, ""),
    );

    const diff = semanticDiff(left, right);
    if (diff.length === 0) {
      console.log("No semantic differences.");
      process.exit(0);
    }

    console.log("| Path | A | B |");
    console.log("| --- | --- | --- |");
    for (const entry of diff) {
      console.log(
        `| ${entry.path || "/"} | ${formatCell(entry.a)} | ${formatCell(entry.b)} |`,
      );
    }
    process.exit(1);
  } catch (error) {
    console.error(
      `canonical-report: invalid JSON or unreadable file (${error.message})`,
    );
    process.exit(2);
  }
}

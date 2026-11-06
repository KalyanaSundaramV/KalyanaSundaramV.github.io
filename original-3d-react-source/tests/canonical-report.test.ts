import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  canonicalize,
  semanticDiff,
  stringifyCanonical,
} from "../scripts/canonical-report.mjs";

describe("canonical report", () => {
  test("drops volatile keys at any depth without mutating input", () => {
    const original = {
      timestamp: "now",
      nested: {
        path: "/tmp/out.json",
        createdAt: "2026-01-01",
        keep: "value",
        list: [{ instanceId: "abc", value: 2 }, { value: 3 }],
      },
    };

    const snapshot = structuredClone(original);
    const result = canonicalize(original);

    expect(result).toEqual({
      nested: {
        keep: "value",
        list: [{ value: 2 }, { value: 3 }],
      },
    });
    expect(original).toEqual(snapshot);
  });

  test("normalizes -0 and rounds non-integer numbers to six decimal places", () => {
    expect(canonicalize({ a: -0, b: 0.1234567, c: { d: 1.23456789 } })).toEqual(
      {
        a: 0,
        b: 0.123457,
        c: { d: 1.234568 },
      },
    );
  });

  test("key order and finding order differences are not reported", () => {
    const a = {
      top: { z: 2, a: 1 },
      findings: [
        { severity: "low", code: "B", message: "z" },
        { severity: "high", code: "A", message: "x" },
      ],
    };
    const b = {
      findings: [
        { severity: "high", code: "A", message: "x" },
        { severity: "low", code: "B", message: "z" },
      ],
      top: { a: 1, z: 2 },
    };

    expect(semanticDiff(a, b)).toEqual([]);
  });

  test("a changed finding code is reported with a JSON pointer path", () => {
    const a = { findings: [{ severity: "low", code: "A", message: "x" }] };
    const b = { findings: [{ severity: "low", code: "B", message: "x" }] };

    expect(semanticDiff(a, b)).toEqual([
      { path: "/findings/0/code", a: "A", b: "B" },
    ]);
  });

  test("plain arrays keep their order and reorder is reported", () => {
    const a = { values: [1, 2, 3] };
    const b = { values: [1, 3, 2] };

    expect(semanticDiff(a, b)).toEqual([
      { path: "/values/1", a: 2, b: 3 },
      { path: "/values/2", a: 3, b: 2 },
    ]);
  });

  test("stringifyCanonical is byte-identical for equivalent inputs", () => {
    const a = {
      findings: [
        { severity: "high", message: "x", code: "AA" },
        { severity: "low", message: "y", code: "ZZ" },
      ],
      top: { z: 2, a: 1 },
    };
    const b = {
      top: { a: 1, z: 2 },
      findings: [
        { code: "ZZ", message: "y", severity: "low" },
        { code: "AA", message: "x", severity: "high" },
      ],
    };

    expect(stringifyCanonical(a)).toBe(stringifyCanonical(b));
  });

  test("CLI exits 0, 1 and 2 for equal, different and invalid inputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "canonical-report-"));

    try {
      const equalLeft = join(dir, "equal-left.json");
      const equalRight = join(dir, "equal-right.json");
      writeFileSync(equalLeft, JSON.stringify({ a: 1, timestamp: "t" }));
      writeFileSync(equalRight, JSON.stringify({ a: 1, path: "x" }));
      const equal = spawnSync(
        "node",
        ["scripts/canonical-report.mjs", equalLeft, equalRight],
        {
          cwd: join(__dirname, ".."),
          encoding: "utf8",
        },
      );
      expect(equal.status).toBe(0);

      const diffLeft = join(dir, "diff-left.json");
      const diffRight = join(dir, "diff-right.json");
      writeFileSync(diffLeft, JSON.stringify({ findings: [{ code: "A" }] }));
      writeFileSync(diffRight, JSON.stringify({ findings: [{ code: "B" }] }));
      const different = spawnSync(
        "node",
        ["scripts/canonical-report.mjs", diffLeft, diffRight],
        {
          cwd: join(__dirname, ".."),
          encoding: "utf8",
        },
      );
      expect(different.status).toBe(1);
      expect(different.stdout).toContain("| /findings/0/code |");

      const bad = join(dir, "bad.json");
      writeFileSync(bad, "{not-json");
      const invalid = spawnSync(
        "node",
        ["scripts/canonical-report.mjs", bad, diffRight],
        {
          cwd: join(__dirname, ".."),
          encoding: "utf8",
        },
      );
      expect(invalid.status).toBe(2);
      expect(invalid.stderr).toContain("invalid JSON");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

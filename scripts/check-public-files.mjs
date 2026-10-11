#!/usr/bin/env node
// Guards what may become public: git-tracked files (public repository) and the
// built `dist` folder (GitHub Pages). Third-party game-asset exports live in a
// private asset repository; only hash-verified runtime files may reach `dist/kit`.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const MB = 1024 * 1024;
const root = process.cwd();
const problems = [];

const trackedBannedExtensions = [
  ".glb",
  ".fbx",
  ".psd",
  ".tga",
  ".prefab",
  ".mat",
  ".unity",
  ".asset",
  ".log",
];
const distBannedExtensions = [
  ".fbx",
  ".psd",
  ".tga",
  ".prefab",
  ".mat",
  ".unity",
  ".asset",
  ".log",
  ".blend",
  ".meta",
];
const kitAssetDirs = ["public/kit/", ".kit-assets/"];
const allowedKitFiles = new Map([
  ["cottage.glb", 8 * MB],
  ["manifest.json", 5 * MB],
]);

const toPosix = (path) => path.split(sep).join("/");
const lower = (path) => path.toLowerCase();
const hasExtension = (path, extensions) =>
  extensions.some((extension) => lower(path).endsWith(extension));
const isGeometryReference = (path) =>
  lower(path).split("/").pop() === "geometry-reference.json";

function checkTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z", "--cached"], {
    cwd: root,
    encoding: "utf8",
  });
  const files = output.split("\0").filter(Boolean);
  for (const file of files) {
    if (kitAssetDirs.some((dir) => file.startsWith(dir))) {
      problems.push(`tracked kit asset: ${file}`);
    }
    if (isGeometryReference(file)) {
      problems.push(`tracked private verification file: ${file}`);
    }
    if (hasExtension(file, trackedBannedExtensions)) {
      problems.push(`tracked prohibited file type: ${file}`);
    }
    const absolute = join(root, file);
    if (existsSync(absolute) && statSync(absolute).size > 5 * MB) {
      problems.push(`tracked file over 5 MB: ${file}`);
    }
  }
  return files.length;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function readKitLock() {
  const lockPath = join(root, "kit.lock.json");
  if (!existsSync(lockPath)) return null;
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (!lock || typeof lock.files !== "object") {
    problems.push("kit.lock.json has no files map");
    return null;
  }
  return lock;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function checkDist() {
  const distRoot = join(root, "dist");
  if (!existsSync(distRoot)) return 0;
  const lock = readKitLock();
  const files = walk(distRoot);
  for (const absolute of files) {
    const path = toPosix(relative(distRoot, absolute));
    const size = statSync(absolute).size;
    if (hasExtension(path, distBannedExtensions)) {
      problems.push(`dist prohibited file type: ${path}`);
    }
    if (isGeometryReference(path)) {
      problems.push(`dist contains private verification file: ${path}`);
    }
    if (path.startsWith("kit/")) {
      const name = path.slice("kit/".length);
      const limit = allowedKitFiles.get(name);
      if (limit === undefined) {
        problems.push(`dist/kit file not allowed: ${path}`);
        continue;
      }
      const expected = lock?.files?.[`kit/${name}`];
      if (!expected) {
        problems.push(`dist/kit file has no kit.lock.json hash: ${path}`);
      } else if (sha256(absolute) !== expected) {
        problems.push(`dist/kit hash mismatch: ${path}`);
      }
      if (size > limit) {
        problems.push(`dist/kit file over ${limit / MB} MB: ${path}`);
      }
      continue;
    }
    if (size > 5 * MB) problems.push(`dist file over 5 MB: ${path}`);
  }
  return files.length;
}

const trackedCount = checkTrackedFiles();
const distCount = checkDist();

if (problems.length > 0) {
  console.error(`check-public-files: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `check-public-files: ok (${trackedCount} tracked, ${distCount} dist files)`,
);

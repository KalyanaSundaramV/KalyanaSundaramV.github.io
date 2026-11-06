import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";

test("integrates the original React source and previous editable portfolio", async () => {
  for (const name of [
    "src/App.tsx",
    "src/components/DestructionLab.tsx",
    "src/components/nav/LiquidNav.tsx",
    "src/components/motion/MotionText.tsx",
    "src/merge.css",
    "src/content/projects.ts",
    "legacy/index.html",
    "legacy/styles.css",
    "legacy/app.js",
    "public/previous-portfolio/index.html",
    "public/resume/Kalyana_Sundaram_V_Resume_Public.pdf"
  ]) await access(new URL(`../${name}`, import.meta.url));
});

test("retains all seven user color palettes with default crimson", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const key of ["crimson","ocean","cyan","cream","mauve","fuchsia","yellow"])
    assert.match(app, new RegExp(`id: "${key}"`));
  assert.match(app, /"crimson";/);
  assert.match(app, /kalyan-portfolio-palette/);
});

test("menu emerges from the tab underline instead of mouse-scale", async () => {
  const stylesheet = await readFile(new URL("../src/merge.css", import.meta.url), "utf8");
  const nav = await readFile(new URL("../src/components/nav/LiquidNav.tsx", import.meta.url), "utf8");
  assert.match(stylesheet, /--merge-line-x/);
  assert.match(stylesheet, /clip-path: inset/);
  assert.match(nav, /rect\.left - navRect\.left/);
  assert.match(nav, /aria-expanded/);
});

test("titles use staggered letters with reduced-motion support", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/merge.css", import.meta.url), "utf8");
  assert.match(app, /MotionText as="h2" text=\{title\}/);
  assert.match(css, /merged-letter-enter/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

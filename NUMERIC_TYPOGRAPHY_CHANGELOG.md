# Kalyana Portfolio — Numeric & Typography Motion Tune-up
Date: 2026-11-06

## Scope
Targeted updates to the existing merged 3D portfolio. All unrelated files, the
original 3D game runtime and React source, the liquid cursor, themes, project data,
assets, routes, and résumé remain unchanged.

## Changed files (6)
- `app.js` — Removed the competing hero-stat animation that ran invisibly behind the
  preloader; emits `ksv:intro-finished` after the intro exits. Preserves the
  live numeric wrapper when the typography slider changes.
- `numeric-motion.js` — Counts visible numeric text on entry, after the loader has
  exited; animates updates both upward and downward. Retains leading zeroes,
  grouping separators, decimal precision, currencies, `%`, `+`, and K/M/B/T suffixes.
  Does not rewrite code blocks or canvas/independently rendered game telemetry.
- `typography-motion.js` (new) — Adds small, staggered fade/translate/blur entrances
  to readable copy, headings, labels, lists, interactive text, and dynamically
  opened popup content. Leaves the actual DOM text intact and honors reduced motion.
- `styles.css` — Enlarges capability/tool/experience titles and details; adds subtle
  card appearance and hover feedback; replaces exaggerated letter rotation with
  legible motion; defines a low-opacity, non-blocking theme change and soft
  theme-responsive text animation.
- `fluid-fx.js` — Replaces ONLY the theme transition runner's old full-screen
  WebGL wipe/ripple presentation with a 630 ms translucent color change, keeping
  the existing callback contract and cursor fluid code untouched.
- `index.html` — Loads the new typography helper after the existing scripts.

## Browser verification
- Hero stats count to 8 / 39 / 12 / 3, starting after intro exit.
- Numeric formatting checks: ₹1,250.50, 12.5%, 03, 4K, and a changing value
  count down to ₹980.25 without losing formatting.
- Numeric changes from the font slider animate up and down.
- Eight project cards, eleven capability cards, five experience entries remain.
- Capability and career dialogs open; no JavaScript errors in Chromium checks.
- 390px mobile check reports no page horizontal overflow.
- The theme menu still changes palettes and the transition exits properly.
- Reduced-motion checks leave content visible without animated entrances.

## Limitations
- The embedded original Three.js/Rapier gameplay is not modified; its rapidly
  changing telemetry is controlled by the independent game runtime.
- Full GPU/physics rendering is outside this set of motion-only regressions.

## Usage
Extract the complete ZIP. Run `START_PORTFOLIO.cmd` on Windows and open the
localhost address in the browser. For the small patch, copy its six source
files over matching relative paths in your current `Kalyana_Portfolio_Original_3D`
folder, keeping the original rest of the project.

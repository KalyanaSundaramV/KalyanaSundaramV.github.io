# Kalyana Portfolio — Surgical Fixes / 2026-11-05

**Base:** `Kalyana_Portfolio_Original_3D_and_Goo_Cursor_Merged.zip` (the existing locally editable merged site).
**Method:** No framework migration, no file renames, no changes to the original Three.js/Rapier game bundles or source, existing theme/shader code, resume PDF, or assets.

## Files changed (exact list)

| File | Exact change |
|---|---|
| `index.html` | Added script references for original-source case-study records and numeric animation; inserted an accessible Fullscreen button in the existing 3D demo toolbar. All existing IDs and structure remain. |
| `styles.css` | Restored desktop `.container` / `.site-header` width to the viewport minus responsive gutters. Shared one `--nav-dialog-radius: 15px` for navbar, case-study modal, and game popup. Fixed cursor/modal layering and title-bar overflow. Added clickable capability/timeline states, uniform card-letter colors, detailed-popup spacing, staggered popup entrances, Fullscreen style, and reduced-motion fallback. |
| `app.js` | Made all 11 skill cards and all 5 experience rows clickable using the existing popup system. Expanded the 8 project popups with true long summaries, technologies, authored case-study sections, metrics, notices, and verified links from the original user-uploaded React source. Linked related projects using existing content rather than invented claims. Added modal re-entry typography sequence and an explicit cursor-refresh event on opening/closing. Existing selectors, theme switching, animations and game launching remain. |
| `original-goo-pointer.js` | Replaced the default OPEN label with context-sensitive labels (VIEW, CLICK, CLOSE, PLAY, SAVE, GO, EMAIL, OPEN for external links); hit-tests beneath the pointer and refreshes on modal state changes, scroll and focus. Retains the current blob size, deformation and droplet motion. |
| `original-3d-demo.js` | Added Fullscreen API toggle, pressed/accessibility state, `fullscreenchange`/Esc handling (including Esc being consumed when fullscreen exits), and delegated demo launch so dynamic project-popup launch buttons work. The original iframe game is unmodified. |

## Files added

| File | Purpose |
|---|---|
| `case-study-data.js` | Authored long-form public case-study data copied from the user-supplied original `apple-glass-original-source/src/content/projects.ts`. Media placeholders and unverified/empty URLs are **not** displayed. |
| `numeric-motion.js` | Generic IntersectionObserver + MutationObserver number animation, preserving leading zeros, decimals, units, percentages, commas, currency symbols, and common localized comma-decimal formats. Handles increases and decreases, respects reduced motion. Preserves the existing hero stat counter. |
| `SURGICAL_CHANGELOG.md` | This implementation and test record. |

**Preservation audit:** All **126 other files** from the existing merged ZIP remain byte-for-byte identical. No files removed.

## Validation

- Node syntax checks passed for all changed/new JavaScript files.
- Chromium DOM tests found 8 project cards, 11 skill cards, 5 experience cards.
- All 24 popups were opened and closed in scripted tests; 8 projects showed 7–9 detail sections each.
- Tool filters still render 4 standalone tools, 1 Unity editor tool, 3 game systems.
- Full-width container and header measured 1368px at a 1440px desktop viewport.
- Chromium checks at 320px and 390px detected no document-level horizontal scrolling.
- Modal radius and navigation shell radius both measured `15px`.
- Cursor displayed CLOSE when hovering the popup close control. It no longer holds VIEW after an opened modal changes the underlying hit target.
- Numeric helper verified count-up/count-down and exact preservation of `€1.234,56`, `$1,234.50`, `03`, `62%`, `8.2M`, `-12.5%`.
- Simulated fullscreenchange events correctly updated button names to Enter/Exit fullscreen.
- No JavaScript page errors in the tested popup interactions.

## Verification limits

- This sandbox's Chromium blocked direct localhost navigation, so actual hardware fullscreen entry and the GPU-backed original game's live physics couldn't be end-to-end tested here. The game source and compiled asset files were not changed.
- The generic number helper applies to the portfolio page DOM, including new/dynamic popup text. The live React/Three.js **game telemetry inside the iframe** is intentionally left under its original render loop; injecting animated text wrappers there risks disrupting gameplay and violates the surgical-edit requirement. Existing main-page hero stat counters retain their original animation.
- The uploaded original project records included placeholder media and absent URLs; these were omitted instead of inventing screenshots or links.

## Run

On Windows, extract the full ZIP, open `Kalyana_Portfolio_Original_3D`, and double-click `START_PORTFOLIO.cmd`. Keep the original bundled assets and JavaScript source together; the original 3D game requires an HTTP localhost server, so opening `index.html` from `file://` is insufficient.


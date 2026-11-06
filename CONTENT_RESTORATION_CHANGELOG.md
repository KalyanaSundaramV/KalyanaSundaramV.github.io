# Original content restoration — source-backed, surgical update

Base: `Kalyana_Portfolio_Tile_Relief_Full.zip`.

## Existing files changed
- `index.html`: Added four original engineering values under About, six destruction-specialty chips, separate current-status statements, and a labeled original procedural-homestead video player.
- `app.js`: Added the three original `ludoTimeline` entries only to the Ludo Demolition case-study dialog. The existing case-study details and gameplay launcher remain untouched.
- `styles.css`: Appended scoped styles for those new sections, with responsive and reduced-motion support.

## Media activated from the uploaded original project
- `media/homestead-preview-poster.webp` (already present)
- `media/homestead-preview.mp4` (already present)
- `media/homestead-preview.webm` (already present)

The media files were already present in the baseline archive, copied originally from `apple-glass-original-source/public/media/` in `Kalyana_Liquid_Portfolio_v3_Full_3D(1).zip`. This patch connects them to the page; it does not modify their contents. The video illustrates the portfolio's procedural 3D environment and is explicitly *not* labeled as footage from the Unity Ludo Demolition game.

Text was copied from these original React files:
- `apple-glass-original-source/src/content/profile.ts` (`values` and `currentStatus`)
- `apple-glass-original-source/src/content/resume.ts` (`ludoTimeline`)

## Regression checks completed
- Verified all four values, both status statements, all six destruction labels and three timeline entries are present.
- `node --check app.js` passed.
- Compared the full original ZIP against the patched folder: 136 of 139 existing files remain unchanged byte-for-byte, with the three exact files above modified.
- The 3D demo bundles, public PDF, liquid cursor, themes, navigation, utility catalog and source projects were not edited.

## Limitation
Automated Chromium navigation to localhost and local files is blocked by the session's browser security settings. A live browser screenshot, responsive visual check and live game test could not be completed here. Please inspect the restored sections on your own computer.

## Run
On Windows use `START_PORTFOLIO.cmd`. On macOS/Linux run `./start_portfolio.sh`.
The restored video is bundled locally, with WebM and MP4 alternatives.

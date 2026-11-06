# Surgical fixes — 6 November 2026

Base: `Kalyana_Portfolio_Numeric_Typography_Full.zip`.

## Files modified
- `index.html`: kept the same route and layout structure; added the source-backed tool catalog below the existing featured cards; updated the two category count labels; made the three Current Work cards and the Education card semantic buttons; replaced the learning-note placeholder statement with a factual practice overview; loaded one new data file.
- `app.js`: stopped pointer-clicked nav tabs from retaining focus; rendered six editor suites, 39 individual editor utilities, and twelve game systems from the uploaded original React catalog; wired their detail popups; added an education detail popup built only from the existing degree and college text; reused the existing project dialog for all three Current Work cards; updated the Learning navigation description.
- `styles.css`: rounded navbar button focus with the existing shared corner-radius token; expanded desktop case-study dialogs; increased capability-card title size; made card borders visible without hover; styled newly clickable current-work/education cards and source-catalog cards with keyboard-focus treatments; added mobile layouts for the catalog.
- `content.js`: restored exact LinkedIn and GitHub URLs from `original-3d-react-source/src/content/profile.ts`; removed outdated add-your-links guidance; changed learning-note placeholder copy.

## File added
- `source-tools-catalog.js`: static data transcribed from `original-3d-react-source/src/content/tools.ts` (6 tool suites, 6 groups covering 39 utilities, and 12 game systems), without modifying the original source directory.

## Preserved
- Original React/Three.js/Rapier game, compiled runtime assets and demo files
- All ten themes and palette switching
- Liquid cursor and custom cursor labels
- Numeric and typography animation helpers
- Eight featured projects, five experience entries, eleven skills
- Original HTML IDs, main navigation routes and category controls
- Official local résumé PDF

## Tests performed
- Node syntax checks for all edited JavaScript files.
- Chromium rendered with the existing scripts inlined for a local/offline test because browser navigation to local URLs is restricted in this execution environment.
- Clicked and confirmed 8 featured project popups, 11 skill popups, 5 experience popups, 3 Current Work popups, 1 education popup, 6 suite popups, 39 utility popups, and 12 game-system popups. No browser JavaScript errors.
- Desktop dialog computed width 1180px at a 1440px viewport, with the existing scrolling panel.
- Navigation highlight cleared after pointer leaves; 320px and 390px layouts did not overflow horizontally, including catalog and mobile dialog.
- Social links are sourced from original code but were not opened against live external websites.

## Still needs content from the owner
The original React learning-note array is empty. If three actual note titles, copy and links exist elsewhere, add them after receiving the source; no note titles were fabricated.

# Kalyana Sundaram V — Merged Apple Glass Portfolio

This is your **editable merged source project**. It uses the uploaded
`portfolio-apple-glass` Vite/React/TypeScript project as the primary
implementation. The prior HTML/CSS/JavaScript *Line Morph* portfolio is
preserved under `legacy/` (and at `public/previous-portfolio/`) rather than
being overwritten.

## What was merged

- Original Apple Glass app: React components, Three.js / Rapier demolition
  experience, glass visual assets, project and career content, résumé PDFs,
  animations, case-study dialogs, configs, and source tests.
- Previous Line Morph interaction rebuilt as native React in
  `src/components/nav/LiquidNav.tsx`: a dropdown that unfolds **from the
  underline under the hovered nav tab**, not from the cursor.
- Responsive glass dropdown artwork and section-specific navigation links.
- Seven color palettes from your Pinterest references, with
  **Dark Night + Crimson Bold** as the default. Palette selector is in the
  header, beside the light/dark control. Color choices persist locally.
- Animated letter/word treatments added to section titles, project names,
  tool titles and learning titles via `MotionText.tsx`.
- Palette-aware glows, glass colors, cursor highlights and animated background,
  all in `src/merge.css`. Reduced-motion fallbacks are included.

## Fastest way to preview locally

On **Windows**, extract the ZIP fully and **double-click `OPEN_PORTFOLIO.cmd`**.
It checks for Node.js, installs dependencies on first run, launches the Vite
development server on `http://127.0.0.1:5173/`, and opens your default browser.
Keep the server window open while viewing or editing. For manual launch, use
`npm install` followed by `npm run dev`.

This is a **local deployment on your own computer**, not a hosted/public URL.
The merge was compiled with TypeScript checks in the preparation environment,
but the full Vite bundle was not produced there because that environment lacks
the required Linux-native Rolldown binary. Installing dependencies on Windows
will download the Windows-native binary.

## Run on Windows (VS Code or Terminal)

1. Install Node.js **22.12+** if it is not already installed.
2. Extract this ZIP to a short path, for example `C:\Projects\KalyanaPortfolio`.
3. Open that folder in VS Code.
4. In the integrated terminal run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the localhost URL printed by Vite (usually
   `http://localhost:5173/`).

To build for production:

```powershell
npm run build
npx serve -s dist
```

> This is a Vite app. **Do not** run the earlier Emergent CRA instructions
> (`npm start` / port 3000). The extracted project has a Vite `dev` script.

The source also has a `pnpm-lock.yaml`; for reproducible dependency versions,
you may instead use Corepack/pnpm, if installed:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## Where to edit

| Goal | File |
|---|---|
| Change sections/layout | `src/App.tsx` |
| Update real projects | `src/content/projects.ts` |
| Update personal profile/links | `src/content/profile.ts` |
| Update experience and skills | `src/content/resume.ts` |
| Edit tooling catalog | `src/content/tools.ts` |
| Tune all seven palettes | `src/merge.css` and `paletteOptions` in `src/App.tsx` |
| Adjust underline-to-dropdown | `src/components/nav/LiquidNav.tsx` and `src/merge.css` |
| Adjust title motion | `src/components/motion/MotionText.tsx` and `src/merge.css` |
| Tune base Apple Glass design | `src/glass.css` and `src/index.css` |
| Customize destruction demo | `src/components/DestructionLab.tsx` |
| Swap owner-controlled media | `src/content/ownerAssets.ts` and `public/owner-assets/` |
| Open previous standalone portfolio | `legacy/index.html` |

The archive retains project tests under `tests/`. After dependencies are
installed, use `npm run build` and `npm run test:content`. The `test` script in
the original package expects pnpm, so `pnpm test` is preferred when available.

## Original assets and archives

- `public/` includes the uploaded images, media, and PDF assets.
- `docs/APPLE_GLASS_ORIGINAL_README.md` preserves the uploaded README.
- `legacy/` is the prior line-morph portfolio with its original assets,
  previews and single-file demo. `legacy/index.html` may be opened directly.
- `reference-build/` is an **unmodified compiled snapshot** from the uploaded
  Apple Glass project. It does **not** contain the newly merged changes.
  Use a local static web server pointed at this folder if you want to compare.
- `reference-qa/` preserves the original project's generated QA screenshots.

## Notes and limitations

- `node_modules/` is intentionally excluded. It contained about 1 GB of
  machine-specific dependencies from the original Windows environment.
  `npm install` recreates usable dependencies for your machine.
- Generated build output inside `reference-build/` is preserved for reference;
  run `npm run build` to produce a **new** build with the merged features.
- Current environment has no connected package registry, so a full Vite
  installation/build and in-browser verification of the new React UI could
  not be completed here. Syntax, CSS parsing, source integrity and the
  available content/integration tests were checked.
- The live 3D demonstration is GPU-dependent and has its original fallback.
  Theme palettes do not alter the 3D scene's internal material colors.
- Font licensing should be verified before production deployment; the
  source references a demo display font externally.
- No third-party API keys or private `.env` files were included.

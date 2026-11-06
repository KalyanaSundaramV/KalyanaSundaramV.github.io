# GitHub Pages — commit first, deploy later

This is the full restored portfolio source, including the original Three.js/Rapier
demo. The homepage and game are **already built static assets**. No React build or
paid hosting is needed to serve them through GitHub Pages.

**Current deployment status: NOT DEPLOYED.** The GitHub Actions workflow is
**manual-trigger-only**, so pushing a branch does not publish anything.

## 1. Safely commit on top of the existing live GitHub repository

The uploaded ZIP did not include your existing Git history or `.git` directory,
so an independent snapshot commit cannot be pushed to the live repository as a
normal fast-forward update. Keep the existing GitHub repository and its history.

On your Windows PC, install Git if needed. Then run:

```powershell
git clone https://github.com/kalyanasundaramv/kalyanasundaramv.github.io.git
cd kalyanasundaramv.github.io
git switch -c portfolio-refresh
```

Copy all files **from this unzipped project** into the cloned repository root,
including the hidden `.github` directory. **Do not copy or overwrite `.git`.**
For example, from PowerShell (replace both folder paths):

```powershell
robocopy "C:\Portfolio-GitHub-Ready" "C:\path\to\kalyanasundaramv.github.io" /E /XD .git _site node_modules
```

Then:

```powershell
git status
git add -A
git commit -m "Restore full portfolio content and original 3D demo"
git push -u origin portfolio-refresh
```

This creates a branch and preserves your currently published `main` branch.
Open a Pull Request in GitHub and inspect the diff before merging. If the live
repo is named differently, use that repo's URL rather than the example above.

## 2. Check the static site before deployment

At the root of this unzipped folder:

```powershell
node scripts/prepare-pages.mjs
npx serve _site
```

Or run the included `START_PORTFOLIO.cmd` to test the original local server.

Verify:
- homepage and theme switching
- navigation and project popups
- resume PDF
- **Play Interactive Demo**, including the Three.js/Rapier physics scene
- URLs/paths and any browser console warnings

The files in `_site` are the exact GitHub Pages artifact. The workflow does not
publish the original development source to the site itself.

## 3. When you are ready to make the new version live

1. Merge the reviewed branch into your existing GitHub Pages repository's
   default branch.
2. In that repository, open **Settings → Pages** and set **Build and deployment →
   Source → GitHub Actions**.
3. Open **Actions → Deploy Kalyana Portfolio to GitHub Pages → Run workflow**,
   choose the default branch, and manually run it.
4. Review the deployment logs and visit `https://kalyanasundaramv.github.io/`.

The workflow is deliberately *not* triggered by pushes; there is no automatic
change to the live site just because you committed your files.

## Important deployment constraints

- This Pages setup targets the **root user site**
  `kalyanasundaramv.github.io`. The bundled original 3D app contains
  absolute `/assets/...` paths, so deploying under a subdirectory of a
  different repository needs a separate base-path adjustment.
- The original compiled game lives in `assets/`; do not remove it.
- JavaScript module imports and WebGL need HTTP(S), not `file://`.
- The portfolio makes some requests for external fonts.
- No passwords, secrets, or `.env` files should be committed.
- The `original-3d-react-source/` directory is retained for editing but
  excluded from the published `_site` artifact.

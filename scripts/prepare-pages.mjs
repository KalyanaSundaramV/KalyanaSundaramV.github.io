/**
 * Prepare the prebuilt, static portfolio for GitHub Pages.
 * Only the files required to RUN the site are published; source/README
 * and the original editable React demo remain in the Git repository.
 * This build targets the root user site kalyanasundaramv.github.io.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, '_site');

const files = [
  'index.html',
  'demo-original.html',
  'favicon.svg',
  'styles.css',
  'ambient-fx.js',
  'app.js',
  'case-study-data.js',
  'content.js',
  'fluid-fx.js',
  'immersive.js',
  'numeric-motion.js',
  'original-3d-demo.js',
  'original-goo-pointer.js',
  'source-tools-catalog.js',
  'typography-motion.js',
];

const folders = ['assets', 'kalyan_glass_ui_png_pack', 'media', 'resume'];
for (const relative of [...files, ...folders]) {
  if (!existsSync(join(root, relative))) {
    throw new Error(`Missing required Pages asset: ${relative}`);
  }
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const relative of [...files, ...folders]) {
  cpSync(join(root, relative), join(out, relative), {
    recursive: statSync(join(root, relative)).isDirectory(),
  });
}
writeFileSync(join(out, '.nojekyll'), '');
console.log(`Prepared static site in ${out}`);
console.log('This artifact is intended for the root kalyanasundaramv.github.io domain.');

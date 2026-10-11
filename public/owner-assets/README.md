# Owner Assets

This folder is the private authoring handoff for files that are selected before the public site is built. Visitors never receive upload, delete, or content-editing controls.

## Replace portfolio artwork

1. Add optimized `.webp`, `.avif`, `.jpg`, or `.png` files under `public/owner-assets/art/`.
2. Edit `src/content/ownerAssets.ts` and replace the relevant `src` value with a root-relative path such as `/owner-assets/art/cube-kingdom.webp`.
3. Adjust `position` when the crop needs a different focal point.
4. Run `pnpm build` and review the production preview.

## Assemble owner-supplied meshes

1. Add `.glb` files or self-contained `.gltf` assemblies under `public/owner-assets/meshes/`.
2. Edit `src/content/ownerAssets.ts` and set `meshes.building` or `meshes.environment` to an object containing a display `name` and ordered root-relative `files` paths.
3. Leave a slot as `null` to use the generated procedural building or environment.

Static public assets can be viewed by site visitors after deployment, but only the repository owner can change which assets the built site uses. Do not put private source, credentials, internal documents, or unapproved former-employer material here.

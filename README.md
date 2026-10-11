# Kalyan Scroll World Portfolio

This is an independent clone of `portfolio-destruction` that applies the
[`oso95/scroll-world`](https://github.com/oso95/scroll-world) camera-scrubbing
approach to the existing real-time Three.js destruction scene.

The canvas keeps its authored district-to-building opening flight. Moving the
mouse wheel over the world interrupts that flight and hands control to bounded,
cursor-centered orthographic zoom; dragging continues to orbit the active
building. The original `portfolio-destruction` project remains unchanged.

Artwork and optional mesh assemblies are owner-controlled build inputs. Add
media under `public/owner-assets/`, then select it in
`src/content/ownerAssets.ts`; the public site exposes no upload, delete, or
content-editing controls. Multiple GLB or self-contained GLTF files can still
form one building or environment assembly. Authored transforms and pivots are
preserved before the complete assembly is normalized and grounded. When a part
kit does not share an authored coordinate system, add a project-specific
placement manifest after the source meshes are supplied.

Dark mode also themes the live Three.js scene with a near-black sky and terrain,
dark material grading, lower ambient light, and restrained orange/cyan work
lights. Fractured bodies register live ground hazards so pedestrians and animals
detour around settled debris instead of walking through it.

The upstream skill's optional Higgsfield video-generation pipeline is not used:
this version preserves the live procedural scene and requires no paid media
generation service.

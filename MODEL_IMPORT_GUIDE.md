# Integrating modular building assets into the original 3D demolition sandbox

The screenshots shared in chat are references, not importable 3D geometry. Send the FBX or GLB files plus textures for actual integration.

## Preferred delivery
- One `.glb` per logical destructible part or a GLB that keeps each part as a separate, well-named mesh. A ZIP containing FBX files and their source textures is also acceptable.
- Preserve PBR materials and the source textures (base color, normal, metallic/roughness, opacity where needed).
- Keep uniform real-world scale (meters; 1 Three.js unit = 1 meter as an initial convention), +Y up for the exported GLB, and transforms applied consistently.
- Place pivots sensibly (foundation at ground, parts near their intended hinge or local center); provide the assembly hierarchy and intended anchor locations.
- Use identifiable names: `foundation_01`, `wall_exterior_A`, `window_01`, `roof_north`, `column_01`, and so on.
- Include at least one fully assembled building/prefab or an assembly guide showing where the individual parts belong. Provide approximate dimensions and intended destructions.
- Optional: simplified collider meshes, LOD meshes, sample high-resolution images, source licenses and attribution requirements.

## Implementation plan inside existing source
1. Add the GLB files to `apple-glass-original-source/public/models/` or another static models directory in the original project; preserve the current runtime game during development.
2. Use Three.js `GLTFLoader` (and Draco/Meshopt decoders only if assets use those compression methods).
3. Create a part registry with material, hit points, mass, break thresholds and ownership IDs.
4. Use Rapier fixed/compound/convex colliders as appropriate; avoid expensive concave dynamic collision bodies for every fragment.
5. Assemble buildings from anchors, mark structural vs decorative parts, and apply hits/constraints consistently with the current tool system.
6. Test a single building with wrecking ball, dynamite and camera orbit before importing large city packs.
7. Generate optimizations: meshes with reasonable polygon counts, texture atlases where suitable, pooled debris, appropriate LOD and frame budget.
8. Rebuild the existing React/Three.js source and verify the game's original controls and scoring remain intact.

## Rights
Several screenshots depict commercial asset packs and contain creator/studio marks. Before publishing the 3D models or promotional images in the public portfolio, confirm your redistributable rights and retain required attribution. The original supplied screenshots have **not** been bundled into the public website.

## Testing
No imported mesh models were provided in this turn. No runtime model loading or destruction collider behavior has been changed or claimed as complete.

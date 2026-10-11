import { describe, expect, test } from "vitest";
import {
  clearRigYaw,
  createBuilding,
  createEnvironment,
  RIG_FOOTPRINTS,
  scenePresets,
  type Vec3,
} from "@/lib/destruction";

// Rebuilt here independently of clearRigYaw: neighbouring solids plus the
// target building's own footprint.
function blocked(
  scene: (typeof scenePresets)[number],
  target: Vec3,
  yaw: number,
  footprint: ReadonlyArray<readonly [number, number]>,
) {
  const solids = createEnvironment(scene).props.filter((prop) =>
    ["building", "market", "tank", "stack", "fountain", "mountain"].includes(
      prop.kind,
    ),
  );
  const parts = createBuilding(scene);
  return footprint.some(([lx, lz]) => {
    const x = target[0] + lx * Math.cos(yaw) + lz * Math.sin(yaw);
    const z = target[2] - lx * Math.sin(yaw) + lz * Math.cos(yaw);
    const inBuilding = parts.some(
      (p) =>
        Math.abs(x - p.position[0]) < p.scale[0] / 2 &&
        Math.abs(z - p.position[2]) < p.scale[2] / 2,
    );
    const inProp = solids.some(
      (prop) =>
        Math.abs(x - prop.position[0]) < prop.scale[0] / 2 &&
        Math.abs(z - prop.position[2]) < prop.scale[2] / 2,
    );
    return inBuilding || inProp;
  });
}

describe("tool rig placement", () => {
  test.each(scenePresets.map((scene) => [scene.id, scene] as const))(
    "%s: crane and crusher park clear of every building for a facade hit",
    (_id, scene) => {
      const parts = createBuilding(scene);
      const front = Math.max(
        ...parts.map((p) => p.position[2] + p.scale[2] / 2),
      );
      const centreX =
        parts.find((p) => p.kind === "foundation")?.position[0] ?? 0;
      const target: Vec3 = [centreX, 2, front];
      // Camera looking at the front facade: rig-local +x points along +z.
      const facing = Math.atan2(-1, 0);
      for (const footprint of [RIG_FOOTPRINTS.crane, RIG_FOOTPRINTS.crusher]) {
        const yaw = clearRigYaw(scene, target, facing, footprint);
        expect(blocked(scene, target, yaw, footprint)).toBe(false);
      }
    },
  );
});

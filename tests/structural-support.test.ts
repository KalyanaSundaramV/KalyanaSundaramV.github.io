import { describe, expect, test } from "vitest";
import {
  createBuilding,
  scenePresets,
  type BuildingPartSpec,
} from "@/lib/destruction";
import {
  analyzeStructuralSupport,
  collapseWaves,
} from "@/lib/structuralSupport";

const homestead = createBuilding(
  scenePresets.find((scene) => scene.id === "homestead")!,
);
const centreX = homestead.find((part) => part.kind === "foundation")!
  .position[0];
const frontZ = Math.max(
  ...homestead
    .filter((part) => part.kind === "wall")
    .map((part) => part.position[2]),
);
const isFront = (part: BuildingPartSpec) =>
  Math.abs(part.position[2] - frontZ) < 0.01;
const ids = (parts: BuildingPartSpec[]) => parts.map((part) => part.id).sort();

describe("structural support", () => {
  test.each(scenePresets.map((scene) => [scene.id, scene] as const))(
    "%s stands fully supported before any damage",
    (_id, scene) => {
      expect(
        analyzeStructuralSupport(createBuilding(scene), new Set()),
      ).toEqual([]);
    },
  );

  test("upper walls, glass and trim fall once the walls below them fail", () => {
    const frontWalls = homestead.filter(
      (part) => part.kind === "wall" && isFront(part),
    );
    const lowerLeft = frontWalls.filter(
      (part) => part.level === 1 && part.position[0] < centreX - 0.5,
    );
    expect(lowerLeft).toHaveLength(2);

    const fallen = analyzeStructuralSupport(
      homestead,
      new Set(lowerLeft.map((part) => part.id)),
    );
    const fallenIds = new Set(fallen.map((part) => part.id));

    // Each upper wall left of the doorway has lost the wall below it, and the
    // lintel over the door now hangs from one side only.
    const upperOverGap = frontWalls.filter(
      (part) => part.level === 2 && part.position[0] <= centreX + 0.01,
    );
    upperOverGap.forEach((part) => expect(fallenIds).toContain(part.id));

    // Long facade battens cannot hang off the surviving right-hand walls.
    const battens = homestead.filter(
      (part) => part.kind === "detail" && part.scale[0] > 8,
    );
    const restingOnPorch = battens.filter((part) => part.position[1] < 1.5);
    battens
      .filter((part) => !restingOnPorch.includes(part))
      .forEach((part) => expect(fallenIds).toContain(part.id));

    // Nothing on the intact right-hand side moves.
    frontWalls
      .filter((part) => part.position[0] > centreX + 0.5)
      .forEach((part) => expect(fallenIds).not.toContain(part.id));
  });

  test("a span held from one end falls", () => {
    const columns = homestead.filter((part) => part.kind === "column");
    const porchBeam = homestead.find(
      (part) => part.kind === "beam" && part.position[2] > frontZ,
    )!;
    const leftColumn = columns.reduce((left, part) =>
      part.position[0] < left.position[0] ? part : left,
    );

    const fallen = analyzeStructuralSupport(
      homestead,
      new Set([leftColumn.id]),
    );
    expect(ids(fallen)).toContain(porchBeam.id);
  });

  test("a facade over a destroyed ground floor falls, glass included", () => {
    const industrial = createBuilding(
      scenePresets.find((scene) => scene.id === "industrial")!,
    );
    const front = Math.max(
      ...industrial
        .filter((part) => part.kind === "wall")
        .map((part) => part.position[2]),
    );
    const inFront = (part: BuildingPartSpec) =>
      Math.abs(part.position[2] - front) < 0.3;
    const groundFront = industrial.filter(
      (part) => part.kind === "wall" && inFront(part) && part.position[1] < 3,
    );
    const fallen = new Set(
      analyzeStructuralSupport(
        industrial,
        new Set(groundFront.map((part) => part.id)),
      ).map((part) => part.id),
    );

    // Corner bays stay where they sit on the side (return) walls; every
    // other upper facade panel and pane comes down. Neither a floor slab's
    // edge nor a column against the wall's face holds masonry up.
    const sideWalls = industrial.filter(
      (part) => part.kind === "wall" && part.scale[2] > part.scale[0],
    );
    const onCorner = (part: BuildingPartSpec) =>
      sideWalls.some(
        (side) =>
          Math.abs(side.position[0] - part.position[0]) <
          (side.scale[0] + part.scale[0]) / 2,
      );
    industrial
      .filter(
        (part) =>
          inFront(part) &&
          part.position[1] > 3 &&
          (part.kind === "window" || part.kind === "wall") &&
          !onCorner(part),
      )
      .forEach((part) => expect(fallen).toContain(part.id));
  });

  test("a collapse cascades outward in waves from the failure", () => {
    const columns = homestead.filter((part) => part.kind === "column");
    const failed = new Set(columns.map((part) => part.id));
    const unsupported = analyzeStructuralSupport(homestead, failed);
    const waves = collapseWaves(homestead, failed, unsupported);

    // Every unsupported part falls exactly once.
    expect(ids(waves.flat())).toEqual(ids(unsupported));
    // The porch beam sat on the columns: it goes in the first wave.
    const porchBeam = homestead.find(
      (part) => part.kind === "beam" && part.position[2] > frontZ,
    )!;
    expect(waves[0].map((part) => part.id)).toContain(porchBeam.id);
  });

  test("the result does not depend on part order", () => {
    const failed = new Set(
      homestead
        .filter((part) => part.kind === "wall" && part.level === 1)
        .slice(0, 4)
        .map((part) => part.id),
    );

    expect(ids(analyzeStructuralSupport(homestead, failed))).toEqual(
      ids(analyzeStructuralSupport([...homestead].reverse(), failed)),
    );
  });
});

describe("facade weld", () => {
  test.each(scenePresets.map((scene) => [scene.id, scene] as const))(
    "%s: neighbouring wall panels meet exactly",
    (_id, scene) => {
      const walls = createBuilding(scene).filter(
        (part) => part.kind === "wall" && part.rotation.every((r) => r === 0),
      );
      const span = (part: BuildingPartSpec, axis: number) => [
        part.position[axis] - part.scale[axis] / 2,
        part.position[axis] + part.scale[axis] / 2,
      ];
      for (const a of walls) {
        const axis = a.scale[0] >= a.scale[2] ? 0 : 2;
        const depth = axis === 0 ? 2 : 0;
        for (const b of walls) {
          if (a === b || (b.scale[0] >= b.scale[2] ? 0 : 2) !== axis) continue;
          if (Math.abs(a.position[depth] - b.position[depth]) > 0.05) continue;
          const [ay0, ay1] = span(a, 1);
          const [by0, by1] = span(b, 1);
          if (Math.min(ay1, by1) - Math.max(ay0, by0) < 0.5 * a.scale[1]) {
            continue;
          }
          // Side by side in one plane: flush, or a real opening (> 0.65m).
          const gap = span(b, axis)[0] - span(a, axis)[1];
          if (b.position[axis] > a.position[axis] && gap > -0.5) {
            expect(Math.abs(gap) < 1e-6 || gap >= 0.65).toBe(true);
          }
        }
      }
    },
  );
});

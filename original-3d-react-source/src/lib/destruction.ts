export type SceneId =
  "homestead" | "village" | "industrial" | "civic" | "metro";

export type ToolId =
  "hammer" | "wrecking-ball" | "dynamite" | "crusher" | "plasma";

export type Vec3 = [number, number, number];

export type PartShape =
  "box" | "cylinder" | "roof" | "glass" | "sphere" | "pediment";

export type BuildingMaterial =
  "wood" | "brick" | "concrete" | "glass" | "steel" | "stone" | "tile";

export type BuildingPartSpec = {
  id: string;
  kind:
    | "foundation"
    | "wall"
    | "window"
    | "door"
    | "column"
    | "beam"
    | "roof"
    | "slab"
    | "detail";
  shape: PartShape;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  color: string;
  material: BuildingMaterial;
  level: number;
  fragmentCount: number;
};

export type MovingPath = {
  axis: "x" | "z";
  distance: number;
  speed: number;
  direction: 1 | -1;
};

export type DebrisHazard = {
  id: string;
  x: number;
  z: number;
  radius: number;
};

export type GroundPosition = {
  x: number;
  z: number;
};

export function steerAroundDebris(
  position: GroundPosition,
  hazards: Iterable<DebrisHazard>,
  pathAxis: MovingPath["axis"] | undefined,
  sideSeed: number,
  actorRadius = 0.3,
): GroundPosition {
  const result = { ...position };
  const preferredSide = sideSeed >= 0.5 ? 1 : -1;

  for (const hazard of hazards) {
    const clearance = Math.max(0.2, hazard.radius) + actorRadius;
    let dx = result.x - hazard.x;
    let dz = result.z - hazard.z;

    if (pathAxis) {
      const longitudinal = pathAxis === "x" ? dx : dz;
      const lateral = pathAxis === "x" ? dz : dx;
      const approach = clearance + 1.35;
      if (
        Math.abs(longitudinal) < approach &&
        Math.abs(lateral) < clearance + 0.6
      ) {
        const influence = 1 - Math.abs(longitudinal) / approach;
        const detour = Math.sin((influence * Math.PI) / 2) * (clearance + 0.18);
        const side =
          Math.abs(lateral) > 0.08 ? Math.sign(lateral) : preferredSide;
        if (Math.abs(lateral) < detour) {
          if (pathAxis === "x") result.z = hazard.z + side * detour;
          else result.x = hazard.x + side * detour;
        }
      }
    }

    dx = result.x - hazard.x;
    dz = result.z - hazard.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= clearance) continue;

    if (distance > 0.001) {
      result.x = hazard.x + (dx / distance) * clearance;
      result.z = hazard.z + (dz / distance) * clearance;
    } else if (pathAxis === "x") {
      result.z = hazard.z + preferredSide * clearance;
    } else {
      result.x = hazard.x + preferredSide * clearance;
    }
  }

  return result;
}

/**
 * True when stepping from `from` to `to` pushes an actor into an obstacle
 * ahead of it, so it should wait instead. The actor reaches `halfLength`
 * forward and `halfWidth` sideways, so a car stops for rubble in its own lane
 * only. Moving away is always allowed, so an actor caught by fresh debris can
 * still leave.
 */
export function blockedAhead(
  from: GroundPosition,
  to: GroundPosition,
  obstacles: Iterable<DebrisHazard>,
  halfLength: number,
  halfWidth = halfLength,
): boolean {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  if (length < 1e-6) return false;
  const forwardX = (to.x - from.x) / length;
  const forwardZ = (to.z - from.z) / length;
  for (const obstacle of obstacles) {
    const x = obstacle.x - to.x;
    const z = obstacle.z - to.z;
    const ahead = x * forwardX + z * forwardZ;
    const side = Math.abs(x * forwardZ - z * forwardX);
    if (
      ahead > 0 &&
      Math.hypot(ahead, side) < obstacle.radius + halfLength - 0.02 &&
      side < obstacle.radius + halfWidth - 0.02
    ) {
      return true;
    }
  }
  return false;
}

export type EnvironmentProp = {
  id: string;
  kind:
    | "building"
    | "tree"
    | "lamp"
    | "field"
    | "vehicle"
    | "pedestrian"
    | "animal"
    | "market"
    | "tank"
    | "stack"
    | "fence"
    | "bench"
    | "fountain"
    | "train"
    | "crate"
    | "utility-pole"
    | "mountain"
    | "fire-escape"
    | "bollard";
  position: Vec3;
  scale: Vec3;
  rotation: number;
  color: string;
  delay: number;
  path?: MovingPath;
  style?: "farm" | "machiya" | "industrial" | "civic" | "metro";
  roadAccess?: {
    surfaceId: string;
    facing: "north" | "east" | "south" | "west";
  };
};

export type EnvironmentSurface = {
  id: string;
  kind: "road" | "rail" | "water" | "plaza" | "path";
  position: Vec3;
  scale: Vec3;
  rotation: number;
  color: string;
};

export type EnvironmentLayout = {
  surfaces: EnvironmentSurface[];
  props: EnvironmentProp[];
  overviewDistance: number;
};

export type ScenePreset = {
  id: SceneId;
  label: string;
  structure: string;
  environment: string;
  description: string;
  defaultTool: ToolId;
  seed: number;
  sky: string;
  ground: string;
  accent: string;
};

export const scenePresets: ScenePreset[] = [
  {
    id: "homestead",
    label: "Rural homestead",
    structure: "Timber gabled farmhouse",
    environment: "Barns, fields, fences, livestock, and gravel lanes",
    description: "A weathered timber homestead set inside working farmland.",
    defaultTool: "hammer",
    seed: 1103,
    sky: "#dce8ee",
    ground: "#a3ad82",
    accent: "#8c9b67",
  },
  {
    id: "village",
    label: "Machiya village",
    structure: "Timber machiya house",
    environment: "Tiled roofs, narrow lanes, poles, trees, and foothills",
    description:
      "A compact timber village framed by tiled roofs and mountains.",
    defaultTool: "crusher",
    seed: 2207,
    sky: "#eef2e8",
    ground: "#b4c19a",
    accent: "#c4834d",
  },
  {
    id: "industrial",
    label: "Industrial block",
    structure: "Brick factory tenement",
    environment: "Brick alleys, fire escapes, rail, tanks, and smokestacks",
    description: "A dense brick manufacturing block with working streets.",
    defaultTool: "wrecking-ball",
    seed: 3301,
    sky: "#e8ecee",
    ground: "#aeb4b3",
    accent: "#d77b38",
  },
  {
    id: "civic",
    label: "Civic square",
    structure: "Neoclassical brick hall",
    environment: "Stone plaza, formal avenues, lamps, and civic buildings",
    description:
      "A formal civic hall with masonry mass and a columned portico.",
    defaultTool: "dynamite",
    seed: 4409,
    sky: "#ede9e3",
    ground: "#c6c2b7",
    accent: "#bd714f",
  },
  {
    id: "metro",
    label: "Metro core",
    structure: "Setback glass office tower",
    environment: "Paved plazas, organized traffic, transit, and glass towers",
    description: "A bright commercial core built around a curtain-wall tower.",
    defaultTool: "plasma",
    seed: 5501,
    sky: "#dfe7ea",
    ground: "#aab5b8",
    accent: "#4b91a4",
  },
];

const BUILDING_X = 3.2;

const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

type PartInput = Omit<
  BuildingPartSpec,
  "id" | "position" | "rotation" | "material"
> & {
  position: Vec3;
  rotation?: Vec3;
  material?: BuildingMaterial;
};

const defaultMaterial = (
  scene: ScenePreset,
  input: PartInput,
): BuildingMaterial => {
  if (input.shape === "glass" || input.kind === "window") return "glass";
  if (input.kind === "foundation" || input.kind === "slab") return "concrete";
  if (input.kind === "roof") {
    return scene.id === "homestead" || scene.id === "village"
      ? "tile"
      : scene.id === "industrial"
        ? "steel"
        : "stone";
  }
  if (scene.id === "homestead" || scene.id === "village") return "wood";
  if (scene.id === "industrial" || scene.id === "civic") return "brick";
  return input.kind === "column" || input.kind === "beam"
    ? "steel"
    : "concrete";
};

const part = (
  parts: BuildingPartSpec[],
  scene: ScenePreset,
  input: PartInput,
) => {
  parts.push({
    ...input,
    id: `${scene.id}-part-${parts.length}`,
    material: input.material ?? defaultMaterial(scene, input),
    position: [
      input.position[0] + BUILDING_X,
      input.position[1],
      input.position[2],
    ],
    rotation: input.rotation ?? [0, 0, 0],
  });
};

const wall = (
  parts: BuildingPartSpec[],
  scene: ScenePreset,
  position: Vec3,
  scale: Vec3,
  level: number,
  color = "#dedfdc",
  material?: BuildingMaterial,
) =>
  part(parts, scene, {
    kind: "wall",
    shape: "box",
    position,
    scale,
    color,
    material,
    level,
    fragmentCount: 4,
  });

const beam = (
  parts: BuildingPartSpec[],
  scene: ScenePreset,
  position: Vec3,
  scale: Vec3,
  level: number,
  color = "#687174",
  material?: BuildingMaterial,
) =>
  part(parts, scene, {
    kind: "beam",
    shape: "box",
    position,
    scale,
    color,
    material,
    level,
    fragmentCount: 3,
  });

const pane = (
  parts: BuildingPartSpec[],
  scene: ScenePreset,
  position: Vec3,
  scale: Vec3,
  level: number,
  rotation?: Vec3,
) =>
  part(parts, scene, {
    kind: "window",
    shape: "glass",
    position,
    scale,
    rotation,
    color: "#7395a0",
    material: "glass",
    level,
    fragmentCount: 6,
  });

function farmhouse(scene: ScenePreset) {
  const parts: BuildingPartSpec[] = [];
  part(parts, scene, {
    kind: "foundation",
    shape: "box",
    position: [0, 0.24, 0],
    scale: [7.8, 0.48, 5.6],
    color: "#8f8a80",
    material: "stone",
    level: 0,
    fragmentCount: 5,
  });

  [-2.85, -1.42, 0, 1.42, 2.85].forEach((x) => {
    const doorway = Math.abs(x) < 0.1;
    if (!doorway)
      wall(
        parts,
        scene,
        [x, 1.15, 2.52],
        [1.24, 1.72, 0.24],
        1,
        "#b5aea1",
        "wood",
      );
    wall(
      parts,
      scene,
      [x, 2.55, 2.52],
      [1.24, 0.92, 0.24],
      2,
      "#b5aea1",
      "wood",
    );
    wall(
      parts,
      scene,
      [x, 1.2, -2.52],
      [1.24, 1.8, 0.24],
      1,
      "#a9a397",
      "wood",
    );
    wall(
      parts,
      scene,
      [x, 2.58, -2.52],
      [1.24, 0.86, 0.24],
      2,
      "#a9a397",
      "wood",
    );
  });

  [-3.48, 3.48].forEach((x) => {
    [-1.65, -0.5, 0.65, 1.8].forEach((z) =>
      wall(parts, scene, [x, 1.72, z], [0.24, 2.9, 0.92], 1, "#afa89c", "wood"),
    );
  });

  [-2.05, 2.05].forEach((x) => {
    pane(parts, scene, [x, 1.72, 2.66], [0.84, 1.02, 0.07], 1);
    pane(parts, scene, [x, 1.72, -2.66], [0.84, 1.02, 0.07], 1);
  });
  part(parts, scene, {
    kind: "door",
    shape: "box",
    position: [0, 1.25, 2.67],
    scale: [0.94, 2.05, 0.12],
    color: "#584a3f",
    material: "wood",
    level: 1,
    fragmentCount: 3,
  });

  [-1.45, 0, 1.45].forEach((z) =>
    beam(parts, scene, [0, 3.2, z], [7.25, 0.38, 0.3], 3, "#6c6054", "wood"),
  );

  [-1.28, 1.28].forEach((z, index) =>
    part(parts, scene, {
      kind: "roof",
      shape: "roof",
      position: [0, 3.82, z],
      scale: [8.15, 0.24, 3.2],
      rotation: [index === 0 ? -0.6 : 0.6, 0, 0],
      color: "#5c6261",
      material: "steel",
      level: 3,
      fragmentCount: 6,
    }),
  );

  [-0.78, 0.78].forEach((x, index) =>
    part(parts, scene, {
      kind: "roof",
      shape: "roof",
      position: [-1.45 + x, 4.05, 2.64],
      scale: [2.15, 0.2, 2.8],
      rotation: [0, 0, index === 0 ? 0.68 : -0.68],
      color: "#51595a",
      material: "steel",
      level: 4,
      fragmentCount: 4,
    }),
  );

  part(parts, scene, {
    kind: "detail",
    shape: "box",
    position: [2.15, 4.35, -0.65],
    scale: [0.64, 2.1, 0.64],
    color: "#81654f",
    material: "brick",
    level: 4,
    fragmentCount: 3,
  });

  [-2.85, 2.85].forEach((x) =>
    part(parts, scene, {
      kind: "column",
      shape: "cylinder",
      position: [x, 1.42, 3.35],
      scale: [0.2, 2.45, 0.2],
      color: "#d7d0c4",
      material: "wood",
      level: 1,
      fragmentCount: 3,
    }),
  );
  beam(parts, scene, [0, 2.68, 3.35], [6.2, 0.22, 0.32], 2, "#d7d0c4", "wood");
  part(parts, scene, {
    kind: "slab",
    shape: "box",
    position: [0, 0.52, 3.3],
    scale: [6.7, 0.18, 1.25],
    color: "#756754",
    material: "wood",
    level: 0,
    fragmentCount: 5,
  });

  [0.88, 1.24, 1.6, 1.96, 2.32, 2.68].forEach((y) => {
    part(parts, scene, {
      kind: "detail",
      shape: "box",
      position: [0, y, 2.69],
      scale: [7.05, 0.075, 0.055],
      color: "#887d70",
      material: "wood",
      level: Math.floor(y),
      fragmentCount: 5,
    });
  });
  return parts;
}

function villageShop(scene: ScenePreset) {
  const parts: BuildingPartSpec[] = [];
  part(parts, scene, {
    kind: "foundation",
    shape: "box",
    position: [0, 0.22, 0],
    scale: [7.5, 0.44, 5.4],
    color: "#8d8980",
    material: "stone",
    level: 0,
    fragmentCount: 5,
  });

  [-2.85, -1.43, 0, 1.43, 2.85].forEach((x) => {
    if (Math.abs(x) > 0.25) {
      pane(parts, scene, [x, 1.22, 2.66], [1.05, 1.5, 0.07], 1);
      pane(parts, scene, [x, 3.18, 2.66], [0.9, 0.92, 0.07], 3);
    }
    wall(
      parts,
      scene,
      [x, 2.25, 2.52],
      [1.16, 0.48, 0.28],
      2,
      "#c8bda9",
      "wood",
    );
    wall(
      parts,
      scene,
      [x, 4.02, 2.52],
      [1.16, 0.54, 0.28],
      4,
      "#c8bda9",
      "wood",
    );
    wall(
      parts,
      scene,
      [x, 2.2, -2.52],
      [1.18, 3.8, 0.28],
      2,
      "#bdb29f",
      "wood",
    );
  });
  [-3.5, 3.5].forEach((x) => {
    [-1.75, -0.6, 0.55, 1.7].forEach((z) =>
      wall(parts, scene, [x, 2.2, z], [0.28, 3.8, 0.92], 2, "#c2b6a2", "wood"),
    );
  });
  part(parts, scene, {
    kind: "door",
    shape: "box",
    position: [0, 1.2, 2.68],
    scale: [0.94, 2.02, 0.12],
    color: "#3f342d",
    material: "wood",
    level: 1,
    fragmentCount: 3,
  });

  [-3.55, -2.15, -0.72, 0.72, 2.15, 3.55].forEach((x) =>
    part(parts, scene, {
      kind: "beam",
      shape: "box",
      position: [x, 2.28, 2.72],
      scale: [0.16, 4.05, 0.16],
      color: "#493b31",
      material: "wood",
      level: 2,
      fragmentCount: 3,
    }),
  );
  [2.18, 4.15].forEach((y) =>
    beam(
      parts,
      scene,
      [0, y, 2.72],
      [7.35, 0.18, 0.18],
      Math.round(y),
      "#493b31",
      "wood",
    ),
  );
  [0.92, 1.28, 1.64, 2.86, 3.2, 3.54].forEach((y) =>
    beam(
      parts,
      scene,
      [0, y, 2.73],
      [7.25, 0.055, 0.08],
      Math.floor(y),
      "#685447",
      "wood",
    ),
  );

  [-1.34, 1.34].forEach((z, index) =>
    part(parts, scene, {
      kind: "roof",
      shape: "roof",
      position: [0, 4.78, z],
      scale: [8.15, 0.28, 3.4],
      rotation: [index === 0 ? -0.64 : 0.64, 0, 0],
      color: "#4b4b48",
      material: "tile",
      level: 5,
      fragmentCount: 7,
    }),
  );
  [-3, -2, -1, 0, 1, 2, 3].forEach((x) =>
    part(parts, scene, {
      kind: "detail",
      shape: "box",
      position: [x, 4.98, 0],
      scale: [0.12, 0.12, 6.1],
      color: "#373b3b",
      material: "tile",
      level: 5,
      fragmentCount: 3,
    }),
  );
  beam(parts, scene, [0, 5.12, 0], [8.2, 0.2, 0.22], 6, "#363a39", "wood");
  return parts;
}

function warehouse(scene: ScenePreset) {
  const parts: BuildingPartSpec[] = [];
  part(parts, scene, {
    kind: "foundation",
    shape: "box",
    position: [0, 0.2, 0],
    scale: [10.6, 0.4, 6.6],
    color: "#777b79",
    material: "concrete",
    level: 0,
    fragmentCount: 6,
  });

  for (let floor = 0; floor < 4; floor += 1) {
    const baseY = 0.55 + floor * 1.48;
    part(parts, scene, {
      kind: "slab",
      shape: "box",
      position: [0, baseY, 0],
      scale: [10.1, 0.18, 6.1],
      color: "#777b79",
      material: "concrete",
      level: floor,
      fragmentCount: 6,
    });
    [-4.75, -2.38, 0, 2.38, 4.75].forEach((x) => {
      wall(
        parts,
        scene,
        [x, baseY + 0.74, -3.02],
        [2.1, 1.28, 0.28],
        floor + 1,
        "#8e4f3f",
        "brick",
      );
      if (!(floor === 0 && Math.abs(x) < 0.2)) {
        wall(
          parts,
          scene,
          [x, baseY + 0.35, 3.02],
          [2.08, 0.48, 0.28],
          floor + 1,
          "#985443",
          "brick",
        );
        wall(
          parts,
          scene,
          [x, baseY + 1.12, 3.02],
          [2.08, 0.38, 0.28],
          floor + 1,
          "#985443",
          "brick",
        );
        pane(
          parts,
          scene,
          [x, baseY + 0.77, 3.18],
          [1.34, 0.62, 0.07],
          floor + 1,
        );
      }
    });
    [-2.35, -0.78, 0.78, 2.35].forEach((z) => {
      wall(
        parts,
        scene,
        [-4.96, baseY + 0.74, z],
        [0.28, 1.28, 1.34],
        floor + 1,
        "#8c4c3e",
        "brick",
      );
      wall(
        parts,
        scene,
        [4.96, baseY + 0.74, z],
        [0.28, 1.28, 1.34],
        floor + 1,
        "#8c4c3e",
        "brick",
      );
    });
  }

  [-4.82, -2.42, 0, 2.42, 4.82].forEach((x) => {
    [-3.08, 3.08].forEach((z) =>
      part(parts, scene, {
        kind: "column",
        shape: "box",
        position: [x, 3.35, z],
        scale: [0.34, 6.35, 0.34],
        color: "#6f382e",
        material: "brick",
        level: 3,
        fragmentCount: 4,
      }),
    );
  });

  part(parts, scene, {
    kind: "door",
    shape: "box",
    position: [0, 1.3, 3.18],
    scale: [2.05, 2.2, 0.16],
    color: "#4e585b",
    material: "steel",
    level: 1,
    fragmentCount: 5,
  });

  part(parts, scene, {
    kind: "roof",
    shape: "box",
    position: [0, 6.62, 0],
    scale: [10.7, 0.34, 6.7],
    color: "#555b5c",
    material: "concrete",
    level: 5,
    fragmentCount: 8,
  });
  [-4.95, 4.95].forEach((x) =>
    beam(parts, scene, [x, 6.98, 0], [0.28, 0.7, 6.35], 6, "#8a4b3d", "brick"),
  );
  [-2.85, 2.85].forEach((z) =>
    beam(parts, scene, [0, 6.98, z], [10.1, 0.7, 0.28], 6, "#8a4b3d", "brick"),
  );

  [2.08, 3.56, 5.04].forEach((y, level) => {
    part(parts, scene, {
      kind: "detail",
      shape: "box",
      position: [3.1, y, 3.58],
      scale: [2.65, 0.14, 0.95],
      color: "#444b4d",
      material: "steel",
      level: level + 2,
      fragmentCount: 4,
    });
    [-1, 1].forEach((side) =>
      beam(
        parts,
        scene,
        [3.1 + side * 1.16, y + 0.45, 3.76],
        [0.08, 0.9, 0.08],
        level + 2,
        "#41484a",
        "steel",
      ),
    );
    beam(
      parts,
      scene,
      [3.1, y + 0.83, 3.78],
      [2.55, 0.08, 0.08],
      level + 2,
      "#41484a",
      "steel",
    );
  });
  [2.85, 4.33].forEach((y, index) =>
    part(parts, scene, {
      kind: "detail",
      shape: "box",
      position: [3.1, y, 3.64],
      scale: [2.45, 0.12, 0.56],
      rotation: [0, 0, index % 2 ? -0.5 : 0.5],
      color: "#4a5153",
      material: "steel",
      level: index + 2,
      fragmentCount: 3,
    }),
  );
  return parts;
}

function townHall(scene: ScenePreset) {
  const parts: BuildingPartSpec[] = [];
  [0.16, 0.38, 0.6].forEach((height, index) =>
    part(parts, scene, {
      kind: "foundation",
      shape: "box",
      position: [0, height / 2, 3.4 - index * 0.55],
      scale: [9.2 - index * 0.5, height, 1.3 + index * 0.8],
      color: "#bbb5aa",
      material: "stone",
      level: 0,
      fragmentCount: 4,
    }),
  );
  part(parts, scene, {
    kind: "foundation",
    shape: "box",
    position: [0, 0.28, 0],
    scale: [9.5, 0.56, 6.2],
    color: "#99958e",
    material: "stone",
    level: 0,
    fragmentCount: 6,
  });
  [-3.8, -2.5, -1.2, 0, 1.2, 2.5, 3.8].forEach((x) => {
    wall(
      parts,
      scene,
      [x, 2.45, -2.65],
      [1.05, 4.2, 0.36],
      2,
      "#844b3e",
      "brick",
    );
    if (Math.abs(x) > 0.4)
      pane(parts, scene, [x, 2.55, 2.78], [0.66, 1.05, 0.08], 2);
    if (Math.abs(x) > 0.4) {
      wall(
        parts,
        scene,
        [x, 1.22, 2.64],
        [1.04, 1.2, 0.32],
        1,
        "#8b4f41",
        "brick",
      );
      wall(
        parts,
        scene,
        [x, 3.75, 2.64],
        [1.04, 1.05, 0.32],
        3,
        "#8b4f41",
        "brick",
      );
    }
  });
  [-4.35, 4.35].forEach((x) =>
    wall(parts, scene, [x, 2.45, 0], [0.36, 4.2, 5.2], 2, "#81493c", "brick"),
  );
  [-3.35, -2.02, -0.68, 0.68, 2.02, 3.35].forEach((x) =>
    part(parts, scene, {
      kind: "column",
      shape: "cylinder",
      position: [x, 2.5, 3.2],
      scale: [0.34, 4.2, 0.34],
      color: "#dedbd2",
      material: "stone",
      level: 2,
      fragmentCount: 5,
    }),
  );
  beam(parts, scene, [0, 4.65, 3.2], [8.05, 0.45, 0.58], 4, "#d8d4cb", "stone");
  beam(parts, scene, [0, 4.98, 3.12], [8.5, 0.22, 0.74], 4, "#c7c1b6", "stone");
  part(parts, scene, {
    kind: "roof",
    shape: "pediment",
    position: [0, 5.62, 3.18],
    scale: [8.05, 1.35, 0.48],
    color: "#c9c3b8",
    material: "stone",
    level: 5,
    fragmentCount: 6,
  });
  part(parts, scene, {
    kind: "roof",
    shape: "box",
    position: [0, 4.85, -0.25],
    scale: [9.6, 0.38, 6.5],
    color: "#77736d",
    material: "stone",
    level: 5,
    fragmentCount: 7,
  });
  part(parts, scene, {
    kind: "door",
    shape: "box",
    position: [0, 1.55, 2.86],
    scale: [1.25, 2.5, 0.14],
    color: "#645044",
    material: "wood",
    level: 1,
    fragmentCount: 4,
  });
  [-4.15, 4.15].forEach((x) =>
    part(parts, scene, {
      kind: "detail",
      shape: "box",
      position: [x, 5.25, 0],
      scale: [0.3, 0.9, 5.85],
      color: "#bcb5aa",
      material: "stone",
      level: 5,
      fragmentCount: 4,
    }),
  );
  return parts;
}

function metroTower(scene: ScenePreset) {
  const parts: BuildingPartSpec[] = [];
  part(parts, scene, {
    kind: "foundation",
    shape: "box",
    position: [0, 0.24, 0],
    scale: [7.4, 0.48, 6.4],
    color: "#777d7f",
    material: "concrete",
    level: 0,
    fragmentCount: 7,
  });
  for (let floor = 0; floor < 11; floor += 1) {
    const setback = floor >= 8 ? 0.6 : floor >= 5 ? 0.3 : 0;
    const width = 6.7 - setback * 2;
    const depth = 5.7 - setback * 1.4;
    const y = 0.62 + floor * 0.62;
    part(parts, scene, {
      kind: "slab",
      shape: "box",
      position: [0, y, 0],
      scale: [width, 0.16, depth],
      color: floor % 3 === 0 ? "#626b6e" : "#858d90",
      material: "concrete",
      level: floor,
      fragmentCount: 5,
    });
    [-width / 2 + 0.28, width / 2 - 0.28].forEach((x) => {
      [-depth / 2 + 0.24, depth / 2 - 0.24].forEach((z) =>
        part(parts, scene, {
          kind: "column",
          shape: "box",
          position: [x, y + 0.3, z],
          scale: [0.18, 0.58, 0.18],
          color: "#434c50",
          material: "steel",
          level: floor,
          fragmentCount: 2,
        }),
      );
    });
    [-width / 3, 0, width / 3].forEach((x) => {
      pane(
        parts,
        scene,
        [x, y + 0.3, depth / 2],
        [width / 3.2, 0.48, 0.06],
        floor,
      );
      pane(
        parts,
        scene,
        [x, y + 0.3, -depth / 2],
        [width / 3.2, 0.48, 0.06],
        floor,
      );
    });
    [-depth / 3, 0, depth / 3].forEach((z) => {
      pane(
        parts,
        scene,
        [width / 2, y + 0.3, z],
        [0.06, 0.48, depth / 3.2],
        floor,
      );
      pane(
        parts,
        scene,
        [-width / 2, y + 0.3, z],
        [0.06, 0.48, depth / 3.2],
        floor,
      );
    });
  }
  part(parts, scene, {
    kind: "wall",
    shape: "box",
    position: [0, 3.75, -0.2],
    scale: [1.3, 6.9, 1.5],
    color: "#737b7d",
    material: "concrete",
    level: 5,
    fragmentCount: 7,
  });
  part(parts, scene, {
    kind: "roof",
    shape: "box",
    position: [0, 7.56, 0],
    scale: [4.9, 0.35, 4.25],
    color: "#485357",
    material: "steel",
    level: 12,
    fragmentCount: 6,
  });
  part(parts, scene, {
    kind: "detail",
    shape: "cylinder",
    position: [0, 8.62, 0],
    scale: [0.12, 2.05, 0.12],
    color: scene.accent,
    material: "steel",
    level: 13,
    fragmentCount: 3,
  });
  return parts;
}

export function createBuilding(scene: ScenePreset): BuildingPartSpec[] {
  let parts: BuildingPartSpec[];
  switch (scene.id) {
    case "homestead":
      parts = farmhouse(scene);
      break;
    case "village":
      parts = villageShop(scene);
      break;
    case "industrial":
      parts = warehouse(scene);
      break;
    case "civic":
      parts = townHall(scene);
      break;
    case "metro":
      parts = metroTower(scene);
      break;
  }

  const grandeur: Record<SceneId, Vec3> = {
    homestead: [1.45, 1.45, 1.4],
    village: [1.5, 1.6, 1.45],
    industrial: [1.55, 1.75, 1.5],
    civic: [1.6, 1.8, 1.55],
    metro: [1.6, 2.2, 1.6],
  };
  const [scaleX, scaleY, scaleZ] = grandeur[scene.id];
  const scaled = parts.map((buildingPart): BuildingPartSpec => {
    const closesStructuralSeam =
      buildingPart.kind !== "window" &&
      buildingPart.kind !== "door" &&
      buildingPart.kind !== "detail";
    const seam = closesStructuralSeam ? 0.14 : 0;
    return {
      ...buildingPart,
      position: [
        BUILDING_X + (buildingPart.position[0] - BUILDING_X) * scaleX,
        buildingPart.position[1] * scaleY,
        buildingPart.position[2] * scaleZ,
      ],
      scale: [
        buildingPart.scale[0] * scaleX + seam,
        buildingPart.scale[1] * scaleY + seam * 0.7,
        buildingPart.scale[2] * scaleZ + seam,
      ],
    };
  });
  return weldFacades(scaled);
}

// Largest gap closed between neighbouring panels of one wall plane. Wider
// openings (doorways, arcades) stay open.
const WELD_TOLERANCE: Partial<Record<BuildingPartSpec["kind"], number>> = {
  wall: 0.65,
  window: 0.45,
};

/**
 * Makes each facade read as one surface: neighbouring wall (or window)
 * panels in the same plane are moved to meet exactly at the midpoint of the
 * gap or overlap between them. Gaps showed the building's insides; overlaps
 * put two coplanar faces in the same place, which z-fought into jagged
 * stripes at every joint.
 */
export function weldFacades(parts: BuildingPartSpec[]): BuildingPartSpec[] {
  type Box = { min: Vec3; max: Vec3 };
  const original: Box[] = parts.map((p) => ({
    min: [0, 1, 2].map((i) => p.position[i] - p.scale[i] / 2) as Vec3,
    max: [0, 1, 2].map((i) => p.position[i] + p.scale[i] / 2) as Vec3,
  }));
  const welded: Box[] = original.map((box) => ({
    min: [...box.min] as Vec3,
    max: [...box.max] as Vec3,
  }));
  const longAxis = (p: BuildingPartSpec) => (p.scale[0] >= p.scale[2] ? 0 : 2);
  const overlap = (a: Box, b: Box, axis: number) =>
    Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);

  parts.forEach((a, i) => {
    const tolerance = WELD_TOLERANCE[a.kind];
    if (!tolerance || a.rotation.some((angle) => angle !== 0)) return;
    const axis = longAxis(a);
    const depth = axis === 0 ? 2 : 0;
    // Nearest neighbour along the wall (axis) and above it (1).
    for (const direction of [axis, 1]) {
      const across = direction === 1 ? axis : 1;
      let best = -1;
      let bestGap = Infinity;
      parts.forEach((b, j) => {
        if (
          i === j ||
          b.kind !== a.kind ||
          longAxis(b) !== axis ||
          b.rotation.some((angle) => angle !== 0) ||
          Math.abs(a.position[depth] - b.position[depth]) > 0.05 ||
          b.position[direction] <= a.position[direction] ||
          overlap(original[i], original[j], across) <
            0.5 * Math.min(a.scale[across], b.scale[across])
        ) {
          return;
        }
        const gap = original[j].min[direction] - original[i].max[direction];
        if (Math.abs(gap) < tolerance && gap < bestGap) {
          best = j;
          bestGap = gap;
        }
      });
      if (best < 0) continue;
      const joint =
        (original[i].max[direction] + original[best].min[direction]) / 2;
      welded[i].max[direction] = joint;
      welded[best].min[direction] = joint;
    }
  });

  return parts.map((part, i) => {
    const { min, max } = welded[i];
    return {
      ...part,
      position: [0, 1, 2].map((k) => (min[k] + max[k]) / 2) as Vec3,
      scale: [0, 1, 2].map((k) => max[k] - min[k]) as Vec3,
    };
  });
}

const surface = (
  surfaces: EnvironmentSurface[],
  scene: ScenePreset,
  kind: EnvironmentSurface["kind"],
  position: Vec3,
  scale: Vec3,
  color: string,
  rotation = 0,
) =>
  surfaces.push({
    id: `${scene.id}-surface-${surfaces.length}`,
    kind,
    position,
    scale,
    rotation,
    color,
  });

type PropInput = Omit<EnvironmentProp, "id" | "delay" | "rotation"> & {
  delay?: number;
  rotation?: number;
};

const prop = (props: EnvironmentProp[], scene: ScenePreset, input: PropInput) =>
  props.push({
    ...input,
    id: `${scene.id}-prop-${props.length}`,
    delay: input.delay ?? props.length * 0.035,
    rotation: input.rotation ?? 0,
  });

const alignRailsToTrainRoutes = (
  surfaces: EnvironmentSurface[],
  props: EnvironmentProp[],
) => {
  props
    .filter((item) => item.kind === "train" && item.path)
    .forEach((train) => {
      const path = train.path!;
      const routeAxis = path.axis === "x" ? 0 : 2;
      const crossAxis = path.axis === "x" ? 2 : 0;
      const rail = surfaces.find(
        (item) =>
          item.kind === "rail" &&
          Math.abs(item.position[crossAxis] - train.position[crossAxis]) <=
            Math.max(item.scale[2] / 2 + train.scale[2] / 2 + 0.6, 2.2),
      );
      if (!rail) return;

      const routeLength = path.distance * 2 + train.scale[0] + 2;
      const railPosition = [...rail.position] as Vec3;
      railPosition[routeAxis] = train.position[routeAxis];
      railPosition[crossAxis] = train.position[crossAxis];
      rail.position = railPosition;
      rail.rotation = path.axis === "x" ? 0 : Math.PI / 2;
      rail.scale = [
        Math.max(rail.scale[0], routeLength),
        rail.scale[1],
        Math.max(rail.scale[2], train.scale[2] + 0.55),
      ];
    });
};

function homesteadEnvironment(scene: ScenePreset) {
  const surfaces: EnvironmentSurface[] = [];
  const props: EnvironmentProp[] = [];
  const rand = seeded(scene.seed + 19);
  surface(
    surfaces,
    scene,
    "path",
    [1, 0.035, 6.2],
    [32, 0.06, 1.8],
    "#9b8a71",
    -0.035,
  );
  [-12.5, -7.5, 12.5, 17.5].forEach((x, index) =>
    surface(
      surfaces,
      scene,
      "path",
      [x, 0.026, index % 2 ? -5.5 : -0.5],
      [4.6, 0.04, 8.5],
      "#9e9465",
    ),
  );
  [-12.5, -7.5, 12.5, 17.5].forEach((x, index) =>
    prop(props, scene, {
      kind: "field",
      position: [x, 0.05, index % 2 ? -5.5 : -0.5],
      scale: [4.5, 0.08, 8.1],
      color: index % 2 ? "#b69d57" : "#83975e",
    }),
  );
  for (let index = 0; index < 18; index += 1) {
    prop(props, scene, {
      kind: "tree",
      position: [
        -15 + (index % 9) * 1.45,
        0,
        -10 + Math.floor(index / 9) * 1.9,
      ],
      scale: [0.75 + rand() * 0.25, 0.85 + rand() * 0.4, 0.75 + rand() * 0.25],
      color: rand() > 0.5 ? "#667c55" : "#82905f",
    });
  }
  prop(props, scene, {
    kind: "building",
    position: [14.5, 1.9, -7.8],
    scale: [7.2, 3.8, 5.2],
    color: "#81756b",
    style: "farm",
  });
  prop(props, scene, {
    kind: "building",
    position: [-12.5, 1.45, -7],
    scale: [5.2, 2.9, 4.3],
    color: "#a59a8c",
    style: "farm",
  });
  [-16, -8, 9, 17].forEach((x, index) =>
    prop(props, scene, {
      kind: "fence",
      position: [x, 0.4, index % 2 ? -2.4 : 2.8],
      scale: [4.2, 0.8, 0.1],
      rotation: index % 2 ? 0.05 : -0.04,
      color: "#75634d",
    }),
  );
  [
    [-8, "#6f8755", 1],
    [5, "#9b6848", -1],
  ].forEach(([x, color, direction]) =>
    prop(props, scene, {
      kind: "vehicle",
      position: [x as number, 0.38, 6.2],
      scale: [1.75, 0.78, 0.95],
      color: color as string,
      path: {
        axis: "x",
        distance: 13,
        speed: 0.62,
        direction: direction as 1 | -1,
      },
    }),
  );
  for (let index = 0; index < 6; index += 1) {
    prop(props, scene, {
      kind: "animal",
      position: [-13 + rand() * 6, 0.3, -5 + rand() * 5],
      scale: [0.7, 0.7, 0.7],
      color: index % 2 ? "#e5e0d3" : "#746354",
      path: {
        axis: index % 2 ? "x" : "z",
        distance: 1.4,
        speed: 0.25,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  [-18, -8, 7, 18].forEach((x, index) =>
    prop(props, scene, {
      kind: "mountain",
      position: [x, 0, -18 - (index % 2) * 2],
      scale: [9, 5 + (index % 3), 4],
      color: index % 2 ? "#8c998e" : "#97a49a",
    }),
  );
  return { surfaces, props, overviewDistance: 30 };
}

function villageEnvironment(scene: ScenePreset) {
  const surfaces: EnvironmentSurface[] = [];
  const props: EnvironmentProp[] = [];
  const rand = seeded(scene.seed + 23);
  surface(
    surfaces,
    scene,
    "path",
    [1, 0.035, 6.2],
    [32, 0.06, 2.25],
    "#a39788",
  );
  surface(surfaces, scene, "path", [-7.2, 0.038, -2], [2, 0.06, 27], "#9b9183");
  surface(
    surfaces,
    scene,
    "plaza",
    [-6.3, 0.042, 5.4],
    [5.3, 0.07, 4.6],
    "#b9b0a3",
  );
  for (let index = 0; index < 12; index += 1) {
    const left = index % 2 === 0;
    prop(props, scene, {
      kind: "building",
      position: [
        left ? -11.5 - rand() * 4 : 11.5 + rand() * 4,
        1.5 + rand() * 0.9,
        -9 + rand() * 15,
      ],
      scale: [3.2 + rand() * 2.1, 3 + rand() * 1.8, 3 + rand() * 1.7],
      color: ["#aa9c8b", "#897969", "#c0b3a0"][index % 3],
      rotation: left ? 0.08 : -0.08,
      style: "machiya",
    });
  }
  for (let index = 0; index < 3; index += 1) {
    prop(props, scene, {
      kind: "market",
      position: [-7.4 + index * 1.9, 0.6, 4.4],
      scale: [1.45, 1.1, 1.2],
      color: index % 2 ? "#9b5d45" : "#c6a04e",
    });
  }
  for (let index = 0; index < 10; index += 1) {
    prop(props, scene, {
      kind: "pedestrian",
      position: [-10 + rand() * 20, 0, 4.4 + rand() * 3.6],
      scale: [1, 1, 1],
      color: ["#586f7b", "#855849", "#68745b"][index % 3],
      path: {
        axis: "x",
        distance: 3.5,
        speed: 0.3,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 4; index += 1) {
    prop(props, scene, {
      kind: "vehicle",
      position: [0, 0.38, 6.2],
      scale: index === 0 ? [1.8, 0.76, 0.92] : [1.42, 0.68, 0.84],
      color: ["#7e5048", "#536e7b", "#9a814c", "#62715a"][index],
      path: {
        axis: "x",
        distance: 13,
        speed: 0.62,
        direction: index % 2 ? -1 : 1,
      },
    });
  }
  for (let index = 0; index < 8; index += 1) {
    prop(props, scene, {
      kind: "tree",
      position: [-10 + index * 2.9, 0, index % 2 ? 8.8 : -7.8],
      scale: [0.75, 0.9, 0.75],
      color: index % 2 ? "#647955" : "#75865e",
    });
  }
  [7, 14, 21].forEach((x) =>
    prop(props, scene, {
      kind: "utility-pole",
      position: [x, 0, 8.25],
      scale: [7.5, 4.3, 1],
      color: "#51483f",
    }),
  );
  [-18, -9, 0, 10, 19].forEach((x, index) =>
    prop(props, scene, {
      kind: "mountain",
      position: [x, 0, -21 - (index % 2)],
      scale: [10, 6 + (index % 3), 4],
      color: index % 2 ? "#84918a" : "#93a097",
    }),
  );
  return { surfaces, props, overviewDistance: 31 };
}

function industrialEnvironment(scene: ScenePreset) {
  const surfaces: EnvironmentSurface[] = [];
  const props: EnvironmentProp[] = [];
  const rand = seeded(scene.seed + 29);
  surface(surfaces, scene, "road", [1, 0.035, 6.4], [36, 0.07, 3], "#686e6f");
  surface(
    surfaces,
    scene,
    "road",
    [-8.4, 0.038, -2],
    [2.8, 0.07, 27],
    "#686e6f",
  );
  surface(
    surfaces,
    scene,
    "rail",
    [10, 0.07, -6.2],
    [30, 0.09, 1.6],
    "#665f58",
    0.02,
  );
  for (let index = 0; index < 7; index += 1) {
    prop(props, scene, {
      kind: "building",
      position: [
        index % 2 ? -13.5 : 14.5,
        2.4 + rand() * 1.9,
        -10 + index * 2.8,
      ],
      scale: [5 + rand() * 2.2, 4.8 + rand() * 3.8, 4 + rand() * 2],
      color: index % 2 ? "#7d8585" : "#8f5948",
      style: "industrial",
    });
  }
  for (let index = 0; index < 4; index += 1) {
    prop(props, scene, {
      kind: index % 2 ? "stack" : "tank",
      position: [9 + index * 2.2, 1.6 + index * 0.15, -10],
      scale: [0.8 + index * 0.1, 3.2 + index * 0.4, 0.8 + index * 0.1],
      color: index % 2 ? "#6d7475" : "#a1a7a4",
    });
  }
  prop(props, scene, {
    kind: "train",
    position: [0, 0, -6.2],
    scale: [4.5, 1.2, 1.3],
    color: "#9c6849",
    path: { axis: "x", distance: 19, speed: 0.55, direction: 1 },
  });
  for (let index = 0; index < 6; index += 1) {
    prop(props, scene, {
      kind: "vehicle",
      position: [0, 0.42, 6.4],
      scale: index % 2 ? [1.8, 0.8, 0.95] : [2.4, 1.05, 1.1],
      color: ["#c27b3f", "#657d88", "#9f4f42"][index % 3],
      path: {
        axis: "x",
        distance: 15,
        speed: 0.68,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 8; index += 1) {
    prop(props, scene, {
      kind: "pedestrian",
      position: [-7 + rand() * 17, 0, 4.65],
      scale: [1, 1, 1],
      color: index % 2 ? "#d18a43" : "#59686d",
      path: {
        axis: "x",
        distance: 4,
        speed: 0.28,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 10; index += 1) {
    prop(props, scene, {
      kind: "crate",
      position: [
        10 + (index % 5) * 1.1,
        0.35,
        -1 + Math.floor(index / 5) * 1.1,
      ],
      scale: [0.72, 0.72, 0.72],
      color: index % 2 ? "#9e724e" : "#6c7778",
    });
  }
  [-14, 15].forEach((x) =>
    prop(props, scene, {
      kind: "fire-escape",
      position: [x, 0, -1],
      scale: [3.2, 5.6, 1.2],
      rotation: x < 0 ? Math.PI / 2 : -Math.PI / 2,
      color: "#40484a",
    }),
  );
  [8, 17].forEach((x) =>
    prop(props, scene, {
      kind: "utility-pole",
      position: [x, 0, 8.55],
      scale: [8.8, 4.2, 1],
      color: "#4b4641",
    }),
  );
  return { surfaces, props, overviewDistance: 33 };
}

function civicEnvironment(scene: ScenePreset) {
  const surfaces: EnvironmentSurface[] = [];
  const props: EnvironmentProp[] = [];
  const rand = seeded(scene.seed + 31);
  surface(
    surfaces,
    scene,
    "plaza",
    [3.2, 0.035, 0.25],
    [19, 0.06, 9.5],
    "#c8c2b8",
  );
  surface(surfaces, scene, "road", [0, 0.028, 8.8], [38, 0.05, 2.8], "#777d7e");
  surface(
    surfaces,
    scene,
    "road",
    [-8.5, 0.03, -1],
    [2.7, 0.05, 29],
    "#777d7e",
  );
  surface(surfaces, scene, "water", [17, 0.025, -8], [7, 0.04, 24], "#6f9ea4");
  prop(props, scene, {
    kind: "fountain",
    position: [-4.5, 0.35, 1.2],
    scale: [1.7, 1.7, 1.7],
    color: "#8caaa9",
  });
  for (let index = 0; index < 8; index += 1) {
    prop(props, scene, {
      kind: index % 2 ? "tree" : "lamp",
      position: [
        -6.8 + (index % 4) * 4.5,
        0,
        -4.8 + Math.floor(index / 4) * 11.8,
      ],
      scale: [0.8, 1, 0.8],
      color: index % 2 ? "#6f805f" : "#606869",
    });
  }
  for (let index = 0; index < 6; index += 1) {
    prop(props, scene, {
      kind: "bench",
      position: [-6 + index * 2.4, 0.3, -4.2],
      scale: [1.2, 0.6, 0.5],
      color: "#765f4a",
    });
  }
  for (let index = 0; index < 18; index += 1) {
    prop(props, scene, {
      kind: "pedestrian",
      position: [-7 + rand() * 17, 0, -4.2 + rand() * 12.2],
      scale: [1, 1, 1],
      color: ["#596c7a", "#9a6657", "#77805f", "#5d596f"][index % 4],
      path: {
        axis: index % 2 ? "x" : "z",
        distance: 3.5,
        speed: 0.28,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 5; index += 1) {
    prop(props, scene, {
      kind: "vehicle",
      position: [0, 0.4, 8.8],
      scale: [1.55, 0.72, 0.88],
      color: ["#5d7180", "#8c5a50", "#d0a04f"][index % 3],
      path: {
        axis: "x",
        distance: 17,
        speed: 0.7,
        direction: index % 2 ? -1 : 1,
      },
    });
  }
  [
    [-13, -8, 6.2, 5.2],
    [15, -7, 7.2, 5.8],
    [-14, 7, 6.6, 4.8],
  ].forEach(([x, z, width, height], index) =>
    prop(props, scene, {
      kind: "building",
      position: [x, height / 2, z],
      scale: [width, height, 4.8],
      color: index % 2 ? "#aaa399" : "#967260",
      style: "civic",
    }),
  );
  [-5.8, -3.2, -0.6, 2, 4.6, 7.2].forEach((x) =>
    prop(props, scene, {
      kind: "bollard",
      position: [x, 0, 6.85],
      scale: [0.3, 0.8, 0.3],
      color: "#454c4e",
    }),
  );
  return { surfaces, props, overviewDistance: 34 };
}

function metroEnvironment(scene: ScenePreset) {
  const surfaces: EnvironmentSurface[] = [];
  const props: EnvironmentProp[] = [];
  const rand = seeded(scene.seed + 37);
  surface(
    surfaces,
    scene,
    "plaza",
    [3.2, 0.025, 0],
    [10.8, 0.05, 8.4],
    "#bfc4c2",
  );
  [-8, 8, 18].forEach((z) =>
    surface(surfaces, scene, "road", [2, 0.035, z], [43, 0.06, 3.5], "#626b6e"),
  );
  [-5, 10.5, 20].forEach((x) =>
    surface(surfaces, scene, "road", [x, 0.038, 3], [3.4, 0.06, 37], "#626b6e"),
  );
  surface(surfaces, scene, "rail", [2, 0.045, -12], [42, 0.25, 1.8], "#50595d");
  const towerSites: Array<[number, number]> = [
    [-17, -17],
    [-8, -17],
    [4, -17],
    [15, -17],
    [-16, 1],
    [16, 1],
    [-17, 16],
    [18, 16],
  ];
  towerSites.forEach(([x, z], index) => {
    const height = 6.2 + rand() * 6.2;
    prop(props, scene, {
      kind: "building",
      position: [x, height / 2, z],
      scale: [4.4 + rand() * 2.6, height, 4.1 + rand() * 2.4],
      color: ["#73878e", "#9a9d99", "#5f7881", "#8c8378"][index % 4],
      style: "metro",
    });
  });
  prop(props, scene, {
    kind: "train",
    position: [0, 0.1, -12],
    scale: [5.8, 1.05, 1.2],
    color: "#d2a044",
    path: { axis: "x", distance: 25, speed: 1.15, direction: 1 },
  });
  for (let index = 0; index < 16; index += 1) {
    const lane = index % 2 ? 8 : -8;
    prop(props, scene, {
      kind: "vehicle",
      position: [0, 0.4, lane],
      scale: index % 5 === 0 ? [2.4, 0.95, 1.05] : [1.45, 0.65, 0.82],
      color: ["#b85944", "#4f7483", "#d1a54c", "#6c775f"][index % 4],
      path: {
        axis: "x",
        distance: 19,
        speed: 0.88,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 22; index += 1) {
    prop(props, scene, {
      kind: "pedestrian",
      position: [-14 + rand() * 30, 0, index % 2 ? 5.6 : -5.6],
      scale: [1, 1, 1],
      color: ["#5a6c78", "#9b6257", "#6f7d5c", "#6f5e7f"][index % 4],
      path: {
        axis: index % 2 ? "x" : "z",
        distance: 4.5,
        speed: 0.36,
        direction: index % 2 ? 1 : -1,
      },
    });
  }
  for (let index = 0; index < 16; index += 1) {
    prop(props, scene, {
      kind: "lamp",
      position: [-15 + index * 2.1, 0, index % 2 ? -5.7 : 5.7],
      scale: [1, 1, 1],
      color: "#565f62",
    });
  }
  [-1.5, 1, 5.4, 7.8].forEach((x, index) => {
    prop(props, scene, {
      kind: index % 2 ? "bench" : "tree",
      position: [x, 0, index < 2 ? -4.6 : 4.6],
      scale: index % 2 ? [1.3, 0.62, 0.5] : [0.7, 0.9, 0.7],
      color: index % 2 ? "#6e5d4e" : "#6c8365",
    });
  });
  return { surfaces, props, overviewDistance: 40 };
}

export type FootprintXZ = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const footprintXZ = (
  position: Vec3,
  scale: Vec3,
  rotation = 0,
  padding = 0,
): FootprintXZ => {
  const cosine = Math.abs(Math.cos(rotation));
  const sine = Math.abs(Math.sin(rotation));
  const halfX = (scale[0] * cosine + scale[2] * sine) / 2 + padding;
  const halfZ = (scale[0] * sine + scale[2] * cosine) / 2 + padding;
  return {
    minX: position[0] - halfX,
    maxX: position[0] + halfX,
    minZ: position[2] - halfZ,
    maxZ: position[2] + halfZ,
  };
};

const footprintsOverlap = (first: FootprintXZ, second: FootprintXZ) =>
  first.minX < second.maxX &&
  first.maxX > second.minX &&
  first.minZ < second.maxZ &&
  first.maxZ > second.minZ;

const activeBuildingFootprint = (scene: ScenePreset): FootprintXZ =>
  createBuilding(scene).reduce<FootprintXZ>(
    (bounds, buildingPart) => ({
      minX: Math.min(
        bounds.minX,
        buildingPart.position[0] - buildingPart.scale[0] / 2,
      ),
      maxX: Math.max(
        bounds.maxX,
        buildingPart.position[0] + buildingPart.scale[0] / 2,
      ),
      minZ: Math.min(
        bounds.minZ,
        buildingPart.position[2] - buildingPart.scale[2] / 2,
      ),
      maxZ: Math.max(
        bounds.maxZ,
        buildingPart.position[2] + buildingPart.scale[2] / 2,
      ),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );

const centeredFrontageOffsets = (length: number, step: number) => {
  const offsets = [0];
  const limit = Math.max(0, length / 2 - step * 0.55);
  for (let offset = step; offset <= limit; offset += step) {
    offsets.push(offset, -offset);
  }
  return offsets;
};

function placeFrontageBuildings(
  scene: ScenePreset,
  surfaces: EnvironmentSurface[],
  sourceBuildings: EnvironmentProp[],
  reservedProps: EnvironmentProp[],
) {
  const desiredCount: Record<SceneId, number> = {
    homestead: 6,
    village: 12,
    industrial: 11,
    civic: 9,
    metro: 16,
  };
  const style: NonNullable<EnvironmentProp["style"]> =
    scene.id === "homestead"
      ? "farm"
      : scene.id === "village"
        ? "machiya"
        : scene.id;
  const colors: Record<SceneId, string[]> = {
    homestead: ["#8a8177", "#a49a8c", "#756e66"],
    village: ["#8f806e", "#b0a08d", "#74695d"],
    industrial: ["#7a4b40", "#687275", "#955b47"],
    civic: ["#9b7565", "#aaa49a", "#82675c"],
    metro: ["#627b84", "#8a9495", "#516d78"],
  };
  const baseSize: Record<SceneId, Vec3> = {
    homestead: [7.4, 5.2, 5.8],
    village: [6.2, 6.4, 5.1],
    industrial: [7.8, 10.4, 6.5],
    civic: [8.4, 8.8, 6.8],
    metro: [7.2, 15.5, 7.2],
  };
  const random = seeded(scene.seed + 911);
  const candidates = sourceBuildings.slice(0, desiredCount[scene.id]);
  while (candidates.length < desiredCount[scene.id]) {
    const index = candidates.length;
    const size = baseSize[scene.id];
    candidates.push({
      id: `${scene.id}-frontage-candidate-${index}`,
      kind: "building",
      position: [0, 0, 0],
      scale: [
        size[0] * (0.82 + random() * 0.34),
        size[1] * (0.78 + random() * 0.48),
        size[2] * (0.82 + random() * 0.3),
      ],
      rotation: 0,
      color: colors[scene.id][index % colors[scene.id].length],
      delay: 0.18 + index * 0.028,
      style,
    });
  }

  const infrastructure = surfaces.map((item) =>
    footprintXZ(item.position, item.scale, item.rotation, 0.55),
  );
  reservedProps
    .filter((item) => item.kind === "field")
    .forEach((item) =>
      infrastructure.push(
        footprintXZ(item.position, item.scale, item.rotation, 0.4),
      ),
    );
  const heroFootprint = activeBuildingFootprint(scene);
  const occupied: FootprintXZ[] = [
    {
      minX: heroFootprint.minX - 2,
      maxX: heroFootprint.maxX + 2,
      minZ: heroFootprint.minZ - 2,
      maxZ: heroFootprint.maxZ + 2,
    },
  ];
  const roads = surfaces
    .filter((item) => item.kind === "road" || item.kind === "path")
    .sort(
      (first, second) =>
        Math.max(second.scale[0], second.scale[2]) -
        Math.max(first.scale[0], first.scale[2]),
    );
  const placed: EnvironmentProp[] = [];

  for (const candidate of candidates) {
    let placement: EnvironmentProp | null = null;
    for (const road of roads) {
      const alongX = road.scale[0] >= road.scale[2];
      const roadLength = alongX ? road.scale[0] : road.scale[2];
      const roadDepth = alongX ? road.scale[2] : road.scale[0];
      const frontageStep = Math.max(5.4, candidate.scale[0] + 1.2);
      const offsets = centeredFrontageOffsets(roadLength, frontageStep);
      const cosine = Math.cos(road.rotation);
      const sine = Math.sin(road.rotation);
      const along = alongX
        ? ([cosine, -sine] as const)
        : ([sine, cosine] as const);
      const outward = alongX
        ? ([sine, cosine] as const)
        : ([cosine, -sine] as const);

      for (const side of [-1, 1] as const) {
        const distance = roadDepth / 2 + candidate.scale[2] / 2 + 1.6;
        const rotation =
          road.rotation +
          (alongX
            ? side > 0
              ? Math.PI
              : 0
            : side > 0
              ? -Math.PI / 2
              : Math.PI / 2);
        const facing: NonNullable<EnvironmentProp["roadAccess"]>["facing"] =
          alongX ? (side > 0 ? "south" : "north") : side > 0 ? "west" : "east";

        for (const offset of offsets) {
          const position: Vec3 = [
            road.position[0] + along[0] * offset + outward[0] * distance * side,
            candidate.scale[1] / 2,
            road.position[2] + along[1] * offset + outward[1] * distance * side,
          ];
          const footprint = footprintXZ(
            position,
            candidate.scale,
            rotation,
            0.65,
          );
          if (infrastructure.some((item) => footprintsOverlap(footprint, item)))
            continue;
          if (occupied.some((item) => footprintsOverlap(footprint, item)))
            continue;

          occupied.push(footprint);
          placement = {
            ...candidate,
            id: `${scene.id}-frontage-building-${placed.length}`,
            position,
            rotation,
            roadAccess: { surfaceId: road.id, facing },
          };
          break;
        }
        if (placement) break;
      }
      if (placement) break;
    }
    if (placement) placed.push(placement);
  }

  return { placed, occupied };
}

export function createEnvironment(scene: ScenePreset): EnvironmentLayout {
  let layout: EnvironmentLayout;
  switch (scene.id) {
    case "homestead":
      layout = homesteadEnvironment(scene);
      break;
    case "village":
      layout = villageEnvironment(scene);
      break;
    case "industrial":
      layout = industrialEnvironment(scene);
      break;
    case "civic":
      layout = civicEnvironment(scene);
      break;
    case "metro":
      layout = metroEnvironment(scene);
      break;
  }

  const spread = scene.id === "metro" ? 1.7 : 1.58;
  const scalePosition = (position: Vec3): Vec3 => [
    BUILDING_X + (position[0] - BUILDING_X) * spread,
    position[1],
    position[2] * spread,
  ];
  const surfaces = layout.surfaces.map((item) => ({
    ...item,
    position: scalePosition(item.position),
    scale: [
      item.scale[0] * spread,
      item.scale[1],
      item.scale[2] * spread,
    ] as Vec3,
  }));
  const props: EnvironmentProp[] = layout.props.map((item) => {
    const landmark = item.kind === "building";
    const terrain = item.kind === "mountain" || item.kind === "field";
    const verticalScale = landmark ? 1.35 : terrain ? 1.18 : 1;
    const horizontalScale = landmark ? 1.22 : terrain ? 1.3 : 1;
    const scaledPosition = scalePosition(item.position);
    return {
      ...item,
      position: [
        scaledPosition[0],
        item.position[1] * verticalScale,
        scaledPosition[2],
      ] as Vec3,
      scale: [
        item.scale[0] * horizontalScale,
        item.scale[1] * verticalScale,
        item.scale[2] * horizontalScale,
      ] as Vec3,
      path: item.path
        ? { ...item.path, distance: item.path.distance * spread }
        : undefined,
    };
  });
  alignRailsToTrainRoutes(surfaces, props);

  const sourceBuildings = props.filter((item) => item.kind === "building");
  const nonBuildings = props.filter(
    (item) => item.kind !== "building" && item.kind !== "fire-escape",
  );
  const frontage = placeFrontageBuildings(
    scene,
    surfaces,
    sourceBuildings,
    nonBuildings,
  );
  const clearNonBuildings = nonBuildings.filter((item) => {
    if (item.path) return true;
    const footprint = footprintXZ(
      item.position,
      item.scale,
      item.rotation,
      0.15,
    );
    return !frontage.occupied.some((building) =>
      footprintsOverlap(footprint, building),
    );
  });

  return {
    surfaces,
    props: [...clearNonBuildings, ...frontage.placed],
    overviewDistance: layout.overviewDistance * 1.9,
  };
}

const RIG_OBSTACLES = new Set<EnvironmentProp["kind"]>([
  "building",
  "market",
  "tank",
  "stack",
  "fountain",
  "mountain",
  "fire-escape",
]);

// Rig-local [x, z] points each parked rig occupies, matching the actor
// models in DestructionLab (crane: tracks and boom; crusher: body and mast).
export const RIG_FOOTPRINTS = {
  crane: [
    ...[7.05, 8.8, 10.55].flatMap((x) =>
      [3.03, 4.1, 5.17].map((z) => [x, z] as const),
    ),
    [7.57, 2.73],
    [6.7, 1.39],
    [5.8, 0],
  ],
  crusher: [4.8, 6.35, 7.9].flatMap((x) =>
    [-1.45, 0, 1.45].map((z) => [x, z] as const),
  ),
} satisfies Record<string, ReadonlyArray<readonly [number, number]>>;

/**
 * Heading (yaw about Y) for a tool rig parked beside `target`. Tries the
 * camera-facing heading first, then the nearest headings within 90 degrees,
 * and returns the first where every rig-local [x, z] sample point stays clear
 * of the neighbouring buildings and of the target building itself. Falls
 * back to the preferred heading when nothing is clear.
 */
export function clearRigYaw(
  scene: ScenePreset,
  target: Vec3,
  preferredYaw: number,
  samples: ReadonlyArray<readonly [number, number]>,
) {
  const obstacles = createEnvironment(scene)
    .props.filter((item) => RIG_OBSTACLES.has(item.kind))
    .map((item) => footprintXZ(item.position, item.scale, item.rotation, 0.3));
  const parts = createBuilding(scene);
  obstacles.push({
    minX: Math.min(...parts.map((p) => p.position[0] - p.scale[0] / 2)),
    maxX: Math.max(...parts.map((p) => p.position[0] + p.scale[0] / 2)),
    minZ: Math.min(...parts.map((p) => p.position[2] - p.scale[2] / 2)),
    maxZ: Math.max(...parts.map((p) => p.position[2] + p.scale[2] / 2)),
  });
  const step = Math.PI / 8;
  for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
    const yaw = preferredYaw + k * step;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const blocked = samples.some(([localX, localZ]) => {
      const x = target[0] + localX * cos + localZ * sin;
      const z = target[2] - localX * sin + localZ * cos;
      return obstacles.some(
        (box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ,
      );
    });
    if (!blocked) return yaw;
  }
  return preferredYaw;
}

export const toolLabels: Record<ToolId, string> = {
  hammer: "Hammer",
  "wrecking-ball": "Wrecking ball",
  dynamite: "Dynamite",
  crusher: "Hydraulic crusher",
  plasma: "Plasma cutter",
};

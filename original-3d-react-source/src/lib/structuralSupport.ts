import type { BuildingPartSpec, Vec3 } from "@/lib/destruction";

export type PartBounds = {
  min: Vec3;
  max: Vec3;
};

type HorizontalAxis = 0 | 2;

// Glass and doors sit in openings and carry nothing. Trim needs support
// itself and only carries parts lighter than it is (a fire-escape landing
// holds its railing), so a facade batten cannot hold up the walls it touches.
const NEVER_BEARING = new Set<BuildingPartSpec["kind"]>(["window", "door"]);

const GROUND_CLEARANCE = 0.12;
const CONTACT_TOLERANCE = 0.22;
const VERTICAL_CONTACT_TOLERANCE = 0.3;
// How far a part's centre of mass may sit beyond its supported contact span.
const CANTILEVER = 0.25;

// World-space AABB of the rotated part (three.js Euler order XYZ).
export function getPartBounds(part: BuildingPartSpec): PartBounds {
  const [rx, ry, rz] = part.rotation;
  const [cx, sx] = [Math.cos(rx), Math.sin(rx)];
  const [cy, sy] = [Math.cos(ry), Math.sin(ry)];
  const [cz, sz] = [Math.cos(rz), Math.sin(rz)];
  const rotation = [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * cz * sy, cx * cz - sx * sz * sy, -sx * cy],
    [sx * sz - cx * cz * sy, sx * cz + cx * sz * sy, cx * cy],
  ];
  const half = part.scale.map((size) => size / 2);
  const extent = rotation.map((row) =>
    row.reduce((sum, value, index) => sum + Math.abs(value) * half[index], 0),
  );
  return {
    min: [
      part.position[0] - extent[0],
      part.position[1] - extent[1],
      part.position[2] - extent[2],
    ],
    max: [
      part.position[0] + extent[0],
      part.position[1] + extent[1],
      part.position[2] + extent[2],
    ],
  };
}

function overlapsAxis(
  firstMin: number,
  firstMax: number,
  secondMin: number,
  secondMax: number,
  tolerance = CONTACT_TOLERANCE,
) {
  return firstMax + tolerance >= secondMin && secondMax + tolerance >= firstMin;
}

export function partsTouch(first: BuildingPartSpec, second: BuildingPartSpec) {
  const a = getPartBounds(first);
  const b = getPartBounds(second);
  return (
    overlapsAxis(a.min[0], a.max[0], b.min[0], b.max[0]) &&
    overlapsAxis(
      a.min[1],
      a.max[1],
      b.min[1],
      b.max[1],
      VERTICAL_CONTACT_TOLERANCE,
    ) &&
    overlapsAxis(a.min[2], a.max[2], b.min[2], b.max[2])
  );
}

export function hasVerticalLoadPath(
  part: BuildingPartSpec,
  support: BuildingPartSpec,
) {
  const loadBounds = getPartBounds(part);
  const supportBounds = getPartBounds(support);
  const verticalGap = loadBounds.min[1] - supportBounds.max[1];
  return (
    support.position[1] <= part.position[1] + 0.08 &&
    verticalGap >= -0.32 &&
    verticalGap <= 0.38 &&
    overlapsAxis(
      loadBounds.min[0],
      loadBounds.max[0],
      supportBounds.min[0],
      supportBounds.max[0],
      0.18,
    ) &&
    overlapsAxis(
      loadBounds.min[2],
      loadBounds.max[2],
      supportBounds.min[2],
      supportBounds.max[2],
      0.18,
    )
  );
}

const volume = (part: BuildingPartSpec) =>
  part.scale[0] * part.scale[1] * part.scale[2];

// Whether the supporter spans past one end of the wall along its length:
// a neighbouring wall or a cross wall at the corner, not a column standing
// against the middle of its face.
function reachesWallEnd(wall: BuildingPartSpec, support: BuildingPartSpec) {
  const a = getPartBounds(wall);
  const b = getPartBounds(support);
  const axis: HorizontalAxis =
    a.max[0] - a.min[0] >= a.max[2] - a.min[2] ? 0 : 2;
  return b.min[axis] < a.min[axis] + 0.05 || b.max[axis] > a.max[axis] - 0.05;
}

// A supporter must be able to carry the part, touch it, and reach below the
// part's centre: nothing hangs from the parts above it. Walls are masonry:
// they are carried from below or tied in at their ends, never by a column
// against their face, and a raised floor's edge cannot carry one.
function canBear(
  support: BuildingPartSpec,
  part: BuildingPartSpec,
  groundSlabs: ReadonlySet<string>,
  framedWindows: ReadonlySet<string>,
) {
  if (support.id === part.id || NEVER_BEARING.has(support.kind)) return false;
  // Glass set into masonry goes with its wall (or stands on a ground-level
  // sill, as a shopfront does); curtain glazing hung from floors and beams
  // keeps those supports.
  if (
    framedWindows.has(part.id) &&
    support.kind !== "wall" &&
    support.kind !== "foundation" &&
    !groundSlabs.has(support.id)
  ) {
    return false;
  }
  if (support.kind === "detail" && volume(support) <= volume(part)) {
    return false;
  }
  if (getPartBounds(support).min[1] > part.position[1]) return false;
  const below = hasVerticalLoadPath(part, support);
  if (part.kind === "wall") {
    if (support.kind === "slab" && !groundSlabs.has(support.id)) return false;
    if (!below && !reachesWallEnd(part, support)) return false;
  }
  return below || partsTouch(part, support);
}

// Checked along the part's longer horizontal axis, so a wall face or a pane
// mounted on it is not judged across its thickness.
function centredOverSupport(
  part: BuildingPartSpec,
  supporters: BuildingPartSpec[],
) {
  const bounds = getPartBounds(part);
  const axis: HorizontalAxis =
    bounds.max[0] - bounds.min[0] >= bounds.max[2] - bounds.min[2] ? 0 : 2;
  const partMin = bounds.min[axis];
  const partMax = bounds.max[axis];
  let low = Infinity;
  let high = -Infinity;
  for (const support of supporters) {
    const supportBounds = getPartBounds(support);
    low = Math.min(
      low,
      Math.max(partMin, supportBounds.min[axis] - CONTACT_TOLERANCE),
    );
    high = Math.max(
      high,
      Math.min(partMax, supportBounds.max[axis] + CONTACT_TOLERANCE),
    );
  }
  const centre = (partMin + partMax) / 2;
  return centre >= low - CANTILEVER && centre <= high + CANTILEVER;
}

/**
 * Returns the intact parts with no load path to the ground. Support grows
 * outward from grounded parts: a part joins once load-bearing supported
 * neighbours hold it on both sides of its centre of mass (within a short
 * cantilever), so a span left hanging from one end, or a row held only by
 * trim, is reported as unsupported.
 */
export function analyzeStructuralSupport(
  parts: BuildingPartSpec[],
  failedPartIds: ReadonlySet<string>,
) {
  const intact = parts.filter((part) => !failedPartIds.has(part.id));
  const supported = new Set(
    intact
      .filter(
        (part) =>
          part.kind === "foundation" ||
          getPartBounds(part).min[1] <= GROUND_CLEARANCE,
      )
      .map((part) => part.id),
  );

  // Windows set into a wall opening (touching a wall in the original
  // building), as opposed to curtain glazing.
  const framedWindows = new Set(
    parts
      .filter(
        (part) =>
          part.kind === "window" &&
          parts.some((wall) => wall.kind === "wall" && partsTouch(part, wall)),
      )
      .map((part) => part.id),
  );

  // Slabs bearing directly on a foundation act as ground for walls.
  const foundations = intact.filter((part) => part.kind === "foundation");
  const groundSlabs = new Set(
    intact
      .filter(
        (part) =>
          part.kind === "slab" &&
          foundations.some(
            (foundation) =>
              hasVerticalLoadPath(part, foundation) ||
              partsTouch(part, foundation),
          ),
      )
      .map((part) => part.id),
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (const part of intact) {
      if (supported.has(part.id)) continue;
      const supporters = intact.filter(
        (support) =>
          supported.has(support.id) &&
          canBear(support, part, groundSlabs, framedWindows),
      );
      if (supporters.length > 0 && centredOverSupport(part, supporters)) {
        supported.add(part.id);
        changed = true;
      }
    }
  }

  return intact.filter((part) => !supported.has(part.id));
}

/**
 * Orders a collapse outward from what failed: wave 0 holds the unsupported
 * parts touching a failed part, each later wave the parts touching the wave
 * before. Released one wave at a time, a chain reaction reads as a cascade
 * and each section's fall gets its own time (the domino contract needs it).
 * Parts touching nothing that failed join wave 0.
 */
export function collapseWaves(
  parts: readonly BuildingPartSpec[],
  failedPartIds: ReadonlySet<string>,
  unsupported: readonly BuildingPartSpec[],
): BuildingPartSpec[][] {
  const failed = parts.filter((part) => failedPartIds.has(part.id));
  const linked = (a: BuildingPartSpec, b: BuildingPartSpec) =>
    partsTouch(a, b) || hasVerticalLoadPath(a, b) || hasVerticalLoadPath(b, a);

  let remaining = [...unsupported];
  let frontier = failed;
  const waves: BuildingPartSpec[][] = [];
  while (remaining.length > 0) {
    const wave = remaining.filter((part) =>
      frontier.some((edge) => linked(part, edge)),
    );
    if (wave.length === 0) {
      if (waves.length === 0) waves.push([]);
      waves[0].push(...remaining);
      break;
    }
    waves.push(wave);
    remaining = remaining.filter((part) => !wave.includes(part));
    frontier = wave;
  }
  return waves;
}

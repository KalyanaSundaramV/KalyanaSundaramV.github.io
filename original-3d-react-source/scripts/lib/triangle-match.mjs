/**
 * @typedef {[number, number, number]} Vec3
 * @typedef {[Vec3, Vec3, Vec3]} Triangle
 * @typedef {{ vertexTol?: number, edgeTol?: number, normalTolDeg?: number, cell?: number }} MatchOptions
 * @typedef {{
 *   ok: boolean,
 *   unmatchedReference: number[],
 *   unmatchedCandidate: number[],
 *   diagnostics: { degenerate: { side: "reference" | "candidate", index: number }[] }
 * }} MatchResult
 */

const DEFAULT_OPTIONS = {
  vertexTol: 0.001,
  edgeTol: 0.002,
  normalTolDeg: 1,
  cell: 0.002,
};

const toKey = (x, y, z) => `${x}:${y}:${z}`;

const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (vector) => Math.hypot(vector[0], vector[1], vector[2]);
const normalize = (vector) => {
  const len = length(vector);
  if (len === 0) return [0, 0, 0];
  return vector.map((value) => value / len);
};
const centroid = (triangle) => {
  const x = triangle.reduce((sum, point) => sum + point[0], 0) / 3;
  const y = triangle.reduce((sum, point) => sum + point[1], 0) / 3;
  const z = triangle.reduce((sum, point) => sum + point[2], 0) / 3;
  return [x, y, z];
};
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const triangleArea = (triangle) => {
  const a = subtract(triangle[1], triangle[0]);
  const b = subtract(triangle[2], triangle[0]);
  return length(cross(a, b)) / 2;
};

const sortedEdges = (triangle) => {
  const edges = [
    distance(triangle[0], triangle[1]),
    distance(triangle[1], triangle[2]),
    distance(triangle[2], triangle[0]),
  ].sort((left, right) => left - right);
  return edges;
};

const cellFor = (value, cell) => Math.floor(value / cell);

const cellsForCentroidWindow = (point, cellSize, tolerance) => {
  const minX = cellFor(point[0] - tolerance, cellSize);
  const maxX = cellFor(point[0] + tolerance, cellSize);
  const minY = cellFor(point[1] - tolerance, cellSize);
  const maxY = cellFor(point[1] + tolerance, cellSize);
  const minZ = cellFor(point[2] - tolerance, cellSize);
  const maxZ = cellFor(point[2] + tolerance, cellSize);
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        cells.push(toKey(x, y, z));
      }
    }
  }
  return cells;
};

const vertexPermutationMatches = (
  reference,
  candidate,
  tol,
  anyOrder = false,
) => {
  const permutations = anyOrder
    ? [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ]
    : [
        [0, 1, 2],
        [1, 2, 0],
        [2, 0, 1],
      ];

  return permutations.some((perm) => {
    const matches = [
      distance(reference[0], candidate[perm[0]]),
      distance(reference[1], candidate[perm[1]]),
      distance(reference[2], candidate[perm[2]]),
    ];
    return matches.every((value) => value <= tol);
  });
};

const normalForTriangle = (triangle) => {
  if (triangleArea(triangle) < 1e-9) return null;
  const edgeA = subtract(triangle[1], triangle[0]);
  const edgeB = subtract(triangle[2], triangle[0]);
  return normalize(cross(edgeA, edgeB));
};

const normalsMatch = (reference, candidate, toleranceDegrees) => {
  const refNormal = normalForTriangle(reference);
  const candNormal = normalForTriangle(candidate);

  if (!refNormal || !candNormal) {
    return refNormal === null && candNormal === null;
  }

  const angle = Math.acos(
    Math.max(-1, Math.min(1, dot(refNormal, candNormal))),
  );
  return (angle * 180) / Math.PI <= toleranceDegrees;
};

const sameShapeWithinTolerance = (reference, candidate, edgeTol) => {
  const refEdges = sortedEdges(reference);
  const candEdges = sortedEdges(candidate);
  return refEdges.every(
    (edge, index) => Math.abs(edge - candEdges[index]) <= edgeTol,
  );
};

const trianglesMatch = (reference, candidate, options) => {
  const { vertexTol, edgeTol, normalTolDeg } = options;

  const isDegenerateRef = triangleArea(reference) < 1e-9;
  const isDegenerateCandidate = triangleArea(candidate) < 1e-9;

  if (isDegenerateRef || isDegenerateCandidate) {
    if (!isDegenerateRef || !isDegenerateCandidate) {
      return false;
    }
    return vertexPermutationMatches(reference, candidate, vertexTol, true);
  }

  if (!sameShapeWithinTolerance(reference, candidate, edgeTol)) {
    return false;
  }

  if (!vertexPermutationMatches(reference, candidate, vertexTol)) {
    return false;
  }

  return normalsMatch(reference, candidate, normalTolDeg);
};

/**
 * @param {Triangle[]} reference
 * @param {Triangle[]} candidate
 * @param {MatchOptions} [options]
 * @returns {MatchResult}
 */
export function matchTriangles(reference, candidate, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const referenceCount = reference.length;
  const candidateCount = candidate.length;

  const degenerate = {
    reference: [],
    candidate: [],
  };

  for (let index = 0; index < referenceCount; index += 1) {
    if (triangleArea(reference[index]) < 1e-9) {
      degenerate.reference.push(index);
    }
  }

  for (let index = 0; index < candidateCount; index += 1) {
    if (triangleArea(candidate[index]) < 1e-9) {
      degenerate.candidate.push(index);
    }
  }

  const grid = new Map();
  for (let index = 0; index < referenceCount; index += 1) {
    const tri = reference[index];
    const point = centroid(tri);
    const cell = [
      cellFor(point[0], config.cell),
      cellFor(point[1], config.cell),
      cellFor(point[2], config.cell),
    ];
    const key = toKey(cell[0], cell[1], cell[2]);
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(index);
  }

  const matchedReference = new Set();
  const matchedCandidate = new Set();

  for (
    let candidateIndex = 0;
    candidateIndex < candidateCount;
    candidateIndex += 1
  ) {
    if (matchedCandidate.has(candidateIndex)) continue;

    const point = centroid(candidate[candidateIndex]);
    const keys = cellsForCentroidWindow(point, config.cell, config.vertexTol);
    const possible = new Set();

    for (const key of keys) {
      const matches = grid.get(key);
      if (matches) {
        matches.forEach((value) => possible.add(value));
      }
    }

    const sortedPossible = [...possible].sort((left, right) => left - right);
    let chosenReference = null;

    for (const referenceIndex of sortedPossible) {
      if (matchedReference.has(referenceIndex)) continue;
      if (
        trianglesMatch(
          reference[referenceIndex],
          candidate[candidateIndex],
          config,
        )
      ) {
        chosenReference = referenceIndex;
        break;
      }
    }

    if (chosenReference !== null) {
      matchedReference.add(chosenReference);
      matchedCandidate.add(candidateIndex);
    }
  }

  const unmatchedReference = [];
  for (let index = 0; index < referenceCount; index += 1) {
    if (!matchedReference.has(index)) {
      unmatchedReference.push(index);
    }
  }

  const unmatchedCandidate = [];
  for (let index = 0; index < candidateCount; index += 1) {
    if (!matchedCandidate.has(index)) {
      unmatchedCandidate.push(index);
    }
  }

  return {
    ok:
      unmatchedReference.length === 0 &&
      unmatchedCandidate.length === 0 &&
      referenceCount === candidateCount,
    unmatchedReference,
    unmatchedCandidate,
    diagnostics: {
      degenerate: [
        ...degenerate.reference.map((index) => ({ side: "reference", index })),
        ...degenerate.candidate.map((index) => ({ side: "candidate", index })),
      ],
    },
  };
}

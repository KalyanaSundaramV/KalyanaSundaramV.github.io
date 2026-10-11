import { describe, expect, test } from "vitest";
import { matchTriangles } from "../scripts/lib/triangle-match.mjs";

const tri = (a, b, c) => [a, b, c];
const shift = (triangle, dx, dy, dz) =>
  triangle.map(([x, y, z]) => [x + dx, y + dy, z + dz]);
const duplicate = (triangle, dx = 0, dy = 0, dz = 0) =>
  shift(triangle, dx, dy, dz);

describe("triangle matcher", () => {
  test("accepts cyclic reordering and tiny vertex drift", () => {
    const reference = [tri([0, 0, 0], [1, 0, 0], [0, 1, 0])];
    const candidate = [tri([1, 0, 0], [0, 1, 0], [0.0009, 0, 0])];

    expect(matchTriangles(reference, candidate)).toMatchObject({
      ok: true,
      unmatchedReference: [],
      unmatchedCandidate: [],
    });
  });

  test("accepts cell-boundary centroids and repeated coplanar triangles", () => {
    const reference = [
      tri([0, 0, 0], [0.002, 0, 0], [0, 1, 0]),
      tri([0, 0, 1], [0.002, 0, 1], [0, 1, 1]),
    ];
    const candidate = [
      tri([0.0005, 0, 0], [0.0025, 0, 0], [0.0005, 1, 0]),
      tri([0.0005, 0, 1], [0.0025, 0, 1], [0.0005, 1, 1]),
    ];

    expect(matchTriangles(reference, candidate)).toMatchObject({ ok: true });
  });

  test("rejects anti-cyclic winding and mirrored meshes", () => {
    const reference = [tri([0, 0, 0], [1, 0, 0], [0, 1, 0])];
    const antiCyclic = [tri([0, 0, 0], [0, 1, 0], [1, 0, 0])];
    const mirrored = [tri([0, 0, 0], [-1, 0, 0], [0, 1, 0])];

    expect(matchTriangles(reference, antiCyclic).ok).toBe(false);
    expect(matchTriangles(reference, mirrored).ok).toBe(false);
  });

  test("reports unmatched reference and candidate indices", () => {
    const reference = [
      tri([0, 0, 0], [1, 0, 0], [0, 1, 0]),
      tri([10, 0, 0], [11, 0, 0], [10, 1, 0]),
    ];
    const candidate = [duplicate(reference[0], 0.0005, 0, 0)];

    expect(matchTriangles(reference, candidate)).toMatchObject({
      ok: false,
      unmatchedReference: [1],
      unmatchedCandidate: [],
    });
  });

  test("rejects a 2.1 mm shift and records degenerates", () => {
    const reference = [tri([0, 0, 0], [1, 0, 0], [0, 1, 0])];
    const shifted = [tri([0, 0, 0], [1, 0, 0], [0.0021, 1, 0])];
    const degenerateReference = [tri([0, 0, 0], [1, 0, 0], [2, 0, 0])];

    expect(matchTriangles(reference, shifted).ok).toBe(false);
    expect(matchTriangles(degenerateReference, degenerateReference).ok).toBe(
      true,
    );
    const result = matchTriangles(degenerateReference, [
      tri([0, 0, 0], [2, 0, 0], [1, 0, 0]),
    ]);

    expect(result.ok).toBe(true);
    expect(result.diagnostics.degenerate).toContainEqual({
      side: "reference",
      index: 0,
    });
    expect(result.diagnostics.degenerate).toContainEqual({
      side: "candidate",
      index: 0,
    });
  });
});

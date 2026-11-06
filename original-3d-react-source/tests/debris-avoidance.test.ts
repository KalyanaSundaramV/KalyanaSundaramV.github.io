import { describe, expect, test } from "vitest";
import {
  blockedAhead,
  steerAroundDebris,
  type DebrisHazard,
} from "@/lib/destruction";

const rubble: DebrisHazard = {
  id: "fallen-wall",
  x: 0,
  z: 0,
  radius: 1,
};

describe("debris avoidance", () => {
  test("leaves an unobstructed route unchanged", () => {
    expect(steerAroundDebris({ x: 5, z: 2 }, [], "x", 0.8)).toEqual({
      x: 5,
      z: 2,
    });
  });

  test("builds a smooth lateral detour before a pedestrian reaches rubble", () => {
    const result = steerAroundDebris({ x: -0.8, z: 0 }, [rubble], "x", 0.8);

    expect(result.x).toBe(-0.8);
    expect(result.z).toBeGreaterThan(1);
  });

  test("keeps actors outside the physical rubble clearance", () => {
    const result = steerAroundDebris(
      { x: 0.1, z: 0.1 },
      [rubble],
      undefined,
      0.2,
    );

    expect(Math.hypot(result.x - rubble.x, result.z - rubble.z)).toBeCloseTo(
      1.3,
      5,
    );
  });

  test("uses stable opposite detour sides for different actors", () => {
    const left = steerAroundDebris({ x: 0, z: 0 }, [rubble], "x", 0.2);
    const right = steerAroundDebris({ x: 0, z: 0 }, [rubble], "x", 0.8);

    expect(left.z).toBeLessThan(0);
    expect(right.z).toBeGreaterThan(0);
  });

  test("holds a vehicle at rubble ahead but lets it drive away", () => {
    const into = blockedAhead(
      { x: -1.6, z: 0 },
      { x: -1.5, z: 0 },
      [rubble],
      0.6,
    );
    const away = blockedAhead(
      { x: 0.5, z: 0 },
      { x: 0.6, z: 0 },
      [rubble],
      0.6,
    );
    const clear = blockedAhead(
      { x: -1.8, z: 0 },
      { x: -1.7, z: 0 },
      [rubble],
      0.6,
    );

    // A long, narrow car beside rubble in the other lane keeps driving.
    const otherLane = blockedAhead(
      { x: -1.6, z: 1.52 },
      { x: -1.5, z: 1.52 },
      [rubble],
      1.3,
      0.3,
    );

    expect(into).toBe(true);
    expect(away).toBe(false);
    expect(clear).toBe(false);
    expect(otherLane).toBe(false);
  });
});

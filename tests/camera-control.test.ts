import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createIdleReturn,
  panCorrection,
  stepReturn,
} from "@/lib/cameraControl";

const bounds = { minX: -10, maxX: 10, minY: 0.5, maxY: 12, minZ: -8, maxZ: 8 };

describe("pan bounds", () => {
  test("a target inside the bounds is left alone", () => {
    expect(panCorrection({ x: 1, y: 2, z: 3 }, bounds)).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });

  test("x, y and z are clamped independently", () => {
    expect(panCorrection({ x: 14, y: -1, z: -9 }, bounds)).toEqual({
      x: -4,
      y: 1.5,
      z: 1,
    });
  });

  test("target and camera move by the same vector, keeping the framing", () => {
    const target = { x: 20, y: 3, z: 0 };
    const camera = { x: 32, y: 15, z: 38 };
    const c = panCorrection(target, bounds);
    const offsetBefore = [camera.x - target.x, camera.y - target.y];
    const moved = (p: typeof target) => ({ x: p.x + c.x, y: p.y + c.y });
    const t = moved(target);
    const cam = moved(camera);
    expect([cam.x - t.x, cam.y - t.y]).toEqual(offsetBefore);
    expect(t.x).toBe(10);
  });
});

describe("idle return", () => {
  beforeEach(() => {
    // Only timeouts: tests/setup.ts pins requestAnimationFrame as read-only.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    const onReturn = vi.fn();
    const idle = createIdleReturn({
      delayMs: 8000,
      wheelDebounceMs: 100,
      onReturn,
    });
    return { idle, onReturn };
  };

  test("nothing arms before the intro fly-in is ready", () => {
    const { idle, onReturn } = setup();
    idle.arm();
    idle.wheel();
    vi.advanceTimersByTime(20000);
    expect(onReturn).not.toHaveBeenCalled();
  });

  test("returns after 8 s idle", () => {
    const { idle, onReturn } = setup();
    idle.ready();
    idle.arm();
    vi.advanceTimersByTime(7999);
    expect(onReturn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  test("input cancels a pending return", () => {
    const { idle, onReturn } = setup();
    idle.ready();
    idle.arm();
    vi.advanceTimersByTime(5000);
    idle.cancel();
    vi.advanceTimersByTime(10000);
    expect(onReturn).not.toHaveBeenCalled();
  });

  test("a wheel burst re-arms once, 100 ms after the last event", () => {
    const { idle, onReturn } = setup();
    idle.ready();
    idle.arm();
    for (let i = 0; i < 10; i += 1) {
      idle.wheel();
      vi.advanceTimersByTime(30);
    }
    // 8 s from the first event would have fired by now without the cancel.
    vi.advanceTimersByTime(70 + 7999);
    expect(onReturn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  test("dispose clears both timers", () => {
    const { idle, onReturn } = setup();
    idle.ready();
    idle.arm();
    idle.wheel();
    idle.dispose();
    vi.advanceTimersByTime(20000);
    expect(onReturn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("return glide", () => {
  const desired = { x: 3.2, y: 4, z: 0 };

  test("eases toward the building without overshooting", () => {
    const step = stepReturn({ x: 13.2, y: 4, z: 0 }, desired, 10, 23, 1 / 60);
    expect(step.done).toBe(false);
    expect(step.target.x).toBeLessThan(13.2);
    expect(step.target.x).toBeGreaterThan(desired.x);
    expect(step.zoom).toBeGreaterThan(10);
  });

  test("snaps exactly onto the target and reports done", () => {
    let state = { target: { x: 13.2, y: 4, z: 0 }, zoom: 10, done: false };
    for (let frame = 0; frame < 600 && !state.done; frame += 1) {
      state = stepReturn(state.target, desired, state.zoom, 23, 1 / 60);
    }
    expect(state.done).toBe(true);
    expect(state.target).toEqual(desired);
    expect(state.zoom).toBe(23);
  });
});

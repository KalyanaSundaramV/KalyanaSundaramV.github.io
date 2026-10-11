import { describe, expect, test } from "vitest";
import {
  REPUTATION_KEY,
  applyAttempt,
  isLocked,
  loadReputation,
  saveReputation,
  type FinishedAttempt,
  type ReputationState,
} from "@/lib/reputation";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const fakeStorage = (values: Record<string, string> = {}): FakeStorage => ({
  getItem: (key) => (key in values ? values[key] : null),
  setItem: (key, value) => {
    values[key] = value;
  },
});

describe("reputation", () => {
  test("loadReputation safely handles broken storage", () => {
    const throwing: FakeStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    };

    expect(loadReputation(throwing as Storage)).toBe(0);
  });

  test("saveReputation swallows storage errors", () => {
    const throwing: FakeStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(() => saveReputation(40, throwing as Storage)).not.toThrow();
  });

  test("loadReputation normalizes invalid and valid stored values", () => {
    expect(
      loadReputation(fakeStorage({ [REPUTATION_KEY]: "abc" }) as Storage),
    ).toBe(0);
    expect(
      loadReputation(fakeStorage({ [REPUTATION_KEY]: "25" }) as Storage),
    ).toBe(25);
  });

  test("repeating the same attempt id only changes the score once", () => {
    const start: ReputationState = { score: 15, applied: [1, 2] };
    const passed: FinishedAttempt = {
      attemptId: 3,
      result: "passed",
      violations: 0,
    };

    const first = applyAttempt(start, passed);
    const second = applyAttempt(first, passed);

    expect(first).toEqual({ score: 25, applied: [1, 2, 3] });
    expect(second).toBe(first);
    expect(start).toEqual({ score: 15, applied: [1, 2] });
  });

  test("pass and fail attempts update score as expected", () => {
    const initial: ReputationState = { score: 10, applied: [] };

    expect(
      applyAttempt(initial, { attemptId: 1, result: "passed", violations: 0 }),
    ).toEqual({
      score: 20,
      applied: [1],
    });
    expect(
      applyAttempt(
        { score: 20, applied: [1] },
        { attemptId: 2, result: "failed", violations: 0 },
      ),
    ).toEqual({ score: 15, applied: [1, 2] });
    expect(
      applyAttempt(
        { score: 20, applied: [1] },
        { attemptId: 2, result: "failed", violations: 3 },
      ),
    ).toEqual({ score: 5, applied: [1, 2] });
    expect(initial).toEqual({ score: 10, applied: [] });
  });

  test("isLocked returns null at or above the threshold and the exact reason below", () => {
    expect(isLocked(10, 10)).toBeNull();
    expect(isLocked(10, 11)).toBe("Needs reputation 11 (you have 10)");
    expect(isLocked(0, undefined)).toBeNull();
  });
});

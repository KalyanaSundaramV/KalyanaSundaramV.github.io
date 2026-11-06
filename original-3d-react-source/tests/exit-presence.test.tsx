import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExitPresence } from "@/hooks/useExitPresence";

describe("useExitPresence", () => {
  beforeEach(() =>
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }),
  );
  afterEach(() => vi.useRealTimers());

  it("holds the last value as leaving, then unmounts it", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null }) => useExitPresence(value, 100),
      { initialProps: { value: "a" as string | null } },
    );
    expect(result.current).toEqual(["a", false]);

    rerender({ value: null });
    expect(result.current).toEqual(["a", true]);

    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toEqual([null, false]);
  });

  for (const falsyValue of [0, false, ""] as const) {
    it(`keeps ${String(falsyValue)} mounted until explicitly set to null`, () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number | boolean | string | null }) =>
          useExitPresence(value, 100),
        { initialProps: { value: falsyValue as number | boolean | string | null } },
      );
      expect(result.current).toEqual([falsyValue, false]);

      rerender({ value: null });
      expect(result.current).toEqual([falsyValue, true]);

      act(() => void vi.advanceTimersByTime(100));
      expect(result.current).toEqual([null, false]);
    });
  }

  it("cancels the exit when the value returns", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null }) => useExitPresence(value, 100),
      { initialProps: { value: "a" as string | null } },
    );
    rerender({ value: null });
    rerender({ value: "a" });
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toEqual(["a", false]);
  });
});

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

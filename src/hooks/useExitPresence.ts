import { useEffect, useState } from "react";

/**
 * Keeps the last non-null value mounted for `ms` after `value` goes null, so a
 * CSS transition can play the exit before the component unmounts.
 * Returns `[value to render, true while it is exiting]`.
 */
export function useExitPresence<T>(
  value: T | null,
  ms: number,
): [T | null, boolean] {
  const [held, setHeld] = useState<T | null>(value);

  useEffect(() => {
    if (value) {
      setHeld(value);
      return;
    }
    if (ms <= 0) {
      setHeld(null);
      return;
    }
    const timer = window.setTimeout(() => setHeld(null), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);

  const shown = value ?? held;
  return [shown, !value && shown !== null];
}

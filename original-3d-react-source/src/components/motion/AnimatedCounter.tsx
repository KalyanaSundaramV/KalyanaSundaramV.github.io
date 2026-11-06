import { useEffect, useRef, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  className?: string;
  duration?: number;
  format?: (value: number) => string;
};

const defaultFormat = (value: number) => Math.round(value).toLocaleString();

export function AnimatedCounter({
  value,
  className,
  duration = 500,
  format = defaultFormat,
}: AnimatedCounterProps) {
  const previous = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (
      from === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const raw = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      setDisplayValue(from + (value - from) * eased);
      if (raw < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return (
    <span className={className}>
      <span aria-hidden="true">{format(displayValue)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

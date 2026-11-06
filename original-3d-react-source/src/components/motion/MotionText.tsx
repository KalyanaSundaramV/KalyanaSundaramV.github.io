import { useEffect, useRef, useState, type CSSProperties } from "react";

type MotionTextProps = {
  text: string;
  as?: "span" | "h1" | "h2" | "h3";
  className?: string;
  titleStyle?: CSSProperties;
};

export function MotionText({ text, as: Tag = "span", className = "", titleStyle }: MotionTextProps) {
  const root = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -2% 0px", threshold: 0.06 });
    observer.observe(node);
    setReady(true);
    return () => observer.disconnect();
  }, [text]);
  const parts = text.split(/(\s+)/);
  let index = 0;
  const chars = parts.map((part, p) => /^\s+$/.test(part)
    ? <span className="merged-motion-space" aria-hidden="true" key={`space-${p}`}>{"\u00a0"}</span>
    : <span className="merged-motion-word" aria-hidden="true" key={`${p}-${part}`}>
        {Array.from(part).map((char, i) => {
          const order = index++;
          return <span key={`${i}-${char}`} className="merged-motion-char" style={{ "--letter-order": order } as CSSProperties}>{char}</span>;
        })}
      </span>
  );
  const attr = {
    className: `merged-motion-text ${className}`.trim(),
    "aria-label": text,
    "data-ready": ready,
    "data-visible": visible,
    "data-kinetic-label": text,
    style: titleStyle,
  };
  const attach = (node: HTMLElement | null) => { root.current = node; };
  if (Tag === "h1") return <h1 {...attr} ref={attach}>{chars}</h1>;
  if (Tag === "h2") return <h2 {...attr} ref={attach}>{chars}</h2>;
  if (Tag === "h3") return <h3 {...attr} ref={attach}>{chars}</h3>;
  return <span {...attr} ref={attach}>{chars}</span>;
}

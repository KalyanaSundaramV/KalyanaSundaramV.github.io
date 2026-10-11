import { useEffect, useRef } from "react";

export function PageCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = cursor.current;
    if (!element) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let point = { x: 0, y: 0 };
    const hide = () => {
      element.dataset.visible = "false";
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        !fine.matches ||
        motion.matches ||
        event.pointerType !== "mouse" ||
        document.hidden ||
        !target ||
        target.closest(
          'a,button,input,textarea,select,[contenteditable="true"],[role="button"]',
        ) ||
        window.getSelection()?.toString()
      ) {
        hide();
        return;
      }
      const canvas = target.closest<HTMLCanvasElement>("canvas");
      if (
        canvas &&
        (canvas.dataset.demoControlsReady !== "true" ||
          canvas.closest(".demo-stage")?.getAttribute("data-phase") !== "live")
      ) {
        hide();
        return;
      }
      element.dataset.mode = canvas ? "demo" : "page";
      element.dataset.visible = "true";
      point = { x: event.clientX, y: event.clientY };
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          element.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointercancel", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("keydown", hide);
    document.addEventListener("pointerleave", hide);
    document.addEventListener("visibilitychange", hide);
    document.addEventListener("selectionchange", hide);
    fine.addEventListener("change", hide);
    motion.addEventListener("change", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("keydown", hide);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", hide);
      document.removeEventListener("selectionchange", hide);
      fine.removeEventListener("change", hide);
      motion.removeEventListener("change", hide);
    };
  }, []);
  return (
    <div
      ref={cursor}
      className="page-cursor"
      aria-hidden="true"
      data-liquid-ignore="true"
      data-visible="false"
    >
      <i />
    </div>
  );
}

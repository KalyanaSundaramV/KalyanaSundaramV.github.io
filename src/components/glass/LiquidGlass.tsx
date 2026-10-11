import { useEffect, useRef } from "react";
import type { LiquidLens } from "liquid-gl";

const loadGlass = () => import("liquid-gl");
const tint = (theme: string) =>
  theme === "dark" ? "rgba(37, 44, 76, 0.34)" : "rgba(210, 222, 255, 0.22)";

export function LiquidGlass({
  menuOpen,
  detailOpen,
  theme,
  importer = loadGlass,
}: {
  menuOpen: boolean;
  detailOpen: boolean;
  theme: "light" | "dark";
  importer?: typeof loadGlass;
}) {
  const lens = useRef<LiquidLens | null>(null);
  useEffect(() => {
    // Recreate on theme changes: tint alone cannot refresh a dark snapshot.
    // ponytail: v3 exposes no WebGPU device-loss signal. WebGL has a native
    // context-loss event, so use its fallback chain until that API exists.
    if (import.meta.env.MODE === "test" && importer === loadGlass) return;
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!context) return;
    context.getExtension?.("WEBGL_lose_context")?.loseContext();
    if (typeof IntersectionObserver === "undefined") return;
    const selector = detailOpen
      ? ".case-study-head"
      : menuOpen
        ? ".mobile-menu-head"
        : ".nav-glass";
    const content = detailOpen
      ? ".case-study-head-content"
      : menuOpen
        ? ".mobile-menu-head-content"
        : ".nav-glass-content";
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    const nativeContent = target.querySelector<HTMLElement>(content);
    const previouslyIgnored = nativeContent?.hasAttribute("data-liquid-ignore");
    nativeContent?.setAttribute("data-liquid-ignore", "true");
    let disposed = false;
    let revision = 0;
    let visible = false;
    let lost = false;
    let removeLoss = () => {};
    const destroy = () => {
      revision++;
      removeLoss();
      lens.current?.destroy();
      lens.current = null;
      target.removeAttribute("data-liquid-active");
    };
    const refresh = async () => {
      destroy();
      if (
        disposed ||
        !visible ||
        document.hidden ||
        lost ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const request = revision;
      try {
        const module = await importer();
        if (disposed || request !== revision) return;
        // v3's selector capture masks native text. Disable that compositor;
        // retain the existing content child above the lens and out of snapshots.
        const result = module.default({
          target: selector,
          content: false,
          snapshot: "body",
          engine: "webgl2",
          resolution: 1,
          refraction: 0.008,
          frost: 2,
          bevelDepth: 0.06,
          bevelWidth: 0.12,
          specular: true,
          aberration: 0,
          tilt: false,
          draggable: false,
          interaction: "none",
          magnify: 1,
          helper: false,
          shadow: false,
          tint: tint(theme),
          reveal: "none",
        });
        const created = Array.isArray(result) ? result[0] : result;
        if (!created) return;
        if (disposed || request !== revision) {
          created.destroy();
          return;
        }
        lens.current = created;
        target.dataset.liquidActive = "true";
        // Observe the library's public canvas DOM, never its renderer internals.
        let anchor: HTMLElement = target;
        while (
          anchor.parentElement &&
          !/^(fixed|sticky)$/.test(getComputedStyle(anchor).position)
        )
          anchor = anchor.parentElement;
        const canvases = [
          ...anchor.querySelectorAll<HTMLCanvasElement>(
            "canvas[data-liquid-ignore]",
          ),
        ];
        const onLoss = () => {
          lost = true;
          destroy();
        };
        canvases.forEach((canvas) =>
          canvas.addEventListener("webglcontextlost", onLoss),
        );
        removeLoss = () =>
          canvases.forEach((canvas) =>
            canvas.removeEventListener("webglcontextlost", onLoss),
          );
      } catch {
        destroy();
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const next = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio > 0,
        );
        if (visible !== next) {
          visible = next;
          void refresh();
        }
      },
      { threshold: [0, 0.01] },
    );
    observer.observe(target);
    const visibility = () => {
      void refresh();
    };
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      if (motionQuery.matches) destroy();
      else void refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    motionQuery.addEventListener("change", motion);
    return () => {
      if (!previouslyIgnored)
        nativeContent?.removeAttribute("data-liquid-ignore");
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motionQuery.removeEventListener("change", motion);
      destroy();
    };
  }, [menuOpen, detailOpen, importer, theme]);
  return null;
}

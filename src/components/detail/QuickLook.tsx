import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { PortfolioArtwork } from "@/components/art/PortfolioArtwork";
import { createQuickLookViewModel, type ActiveDetail } from "@/lib/detail";

export type QuickLookState = {
  detail: ActiveDetail;
  anchor: HTMLElement;
  mode: "desktop" | "mobile";
};

export function quickLookId(detail: ActiveDetail) {
  return `quick-look-${detail.kind}-${detail.item.slug}`;
}

export function QuickLookButton({
  detail,
  expanded,
  onOpen,
}: {
  detail: ActiveDetail;
  expanded: boolean;
  onOpen: (detail: ActiveDetail, anchor: HTMLElement) => void;
}) {
  const title =
    detail.kind === "project" ? detail.item.name : detail.item.title;
  return (
    <button
      type="button"
      className="quick-look-info"
      aria-label={`Quick look at ${title}`}
      aria-expanded={expanded}
      aria-controls={quickLookId(detail)}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(detail, event.currentTarget);
      }}
    >
      <Info />
    </button>
  );
}

type Position = {
  left: number;
  top: number;
  width: number;
};

const edge = 14;

export function QuickLook({
  state,
  onClose,
}: {
  state: QuickLookState | null;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    left: edge,
    top: edge,
    width: 320,
  });
  const model = useMemo(
    () => (state ? createQuickLookViewModel(state.detail) : null),
    [state],
  );

  useLayoutEffect(() => {
    if (!state || !popoverRef.current) return;
    const update = () => {
      const anchor = state.anchor.getBoundingClientRect();
      const popover = popoverRef.current?.getBoundingClientRect();
      if (!popover) return;
      if (state.mode === "mobile") {
        const width = Math.min(420, window.innerWidth - edge * 2);
        const availableHeight = window.innerHeight - edge * 2;
        const measuredHeight = Math.min(popover.height, availableHeight);
        setPosition({
          left: Math.max(edge, (window.innerWidth - width) / 2),
          top: Math.max(edge, (window.innerHeight - measuredHeight) / 2),
          width,
        });
        return;
      }

      const width = Math.min(340, window.innerWidth - edge * 2);
      const height = popover.height;
      let left = anchor.right + 12;
      let top = anchor.top;
      if (left + width > window.innerWidth - edge) {
        left = anchor.left - width - 12;
      }
      if (left < edge) {
        left = Math.min(
          window.innerWidth - width - edge,
          Math.max(edge, anchor.left),
        );
        top = anchor.bottom + 12;
        if (top + height > window.innerHeight - edge) {
          top = anchor.top - height - 12;
        }
      }
      top = Math.min(window.innerHeight - height - edge, Math.max(edge, top));
      setPosition({ left, top, width });
    };

    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const closeOutside = (event: PointerEvent) => {
      if (state.mode !== "mobile") return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        popoverRef.current?.contains(target) ||
        state.anchor.contains(target)
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [onClose, state]);

  if (!state || !model) return null;

  return createPortal(
    <div
      ref={popoverRef}
      id={model.id}
      className="quick-look-popover"
      data-mode={state.mode}
      role={state.mode === "mobile" ? "dialog" : "tooltip"}
      aria-label={
        state.mode === "mobile" ? `Quick look at ${model.title}` : undefined
      }
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      <PortfolioArtwork variant={model.artwork} label="Quick look" compact />
      <div className="quick-look-head">
        <span>{model.eyebrow}</span>
        {state.mode === "mobile" ? (
          <button type="button" onClick={onClose} aria-label="Close quick look">
            <X />
          </button>
        ) : null}
      </div>
      <strong>{model.title}</strong>
      <p>{model.summary}</p>
      <ul>
        {model.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
      {state.mode === "mobile" ? (
        <small>Tap the card for the complete detail view.</small>
      ) : null}
    </div>,
    document.body,
  );
}

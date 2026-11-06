import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Square, ArrowDown } from "lucide-react";
import { demoVideoHref, heroPreview } from "@/content/demo";
import {
  DEMO_PLAY_REQUEST_EVENT,
  DESTRUCTION_USE_TOOL_EVENT,
} from "@/lib/events";
import { motionTokens } from "@/lib/motion";

const DestructionLab = lazy(() =>
  import("@/components/DestructionLab").then((module) => ({
    default: module.DestructionLab,
  })),
);
export type DemoPhase = "poster" | "loading" | "live" | "unavailable";
const motionQuery = "(prefers-reduced-motion: reduce)";
function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension?.("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}
class DemoLoadBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Interactive demo failed to load", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
// Listener readiness is separate from the first rendered frame.
function LabMounted({ onMounted }: { onMounted: () => void }) {
  useEffect(() => {
    onMounted();
  }, [onMounted]);
  return null;
}
function DemoPreview({ released }: { released: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(
    () => window.matchMedia(motionQuery).matches,
  );
  const [failed, setFailed] = useState(false);
  const [previewError, setPreviewError] = useState<string>();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element || released || typeof IntersectionObserver === "undefined")
      return;
    const target = element.closest("#home") ?? element.parentElement!;
    const observer = new IntersectionObserver(
      (entries) =>
        setVisible(
          entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35,
          ),
        ),
      { threshold: [0, 0.35] },
    );
    observer.observe(target);
    const visibility = () => setHidden(document.hidden);
    const query = window.matchMedia(motionQuery);
    const motion = () => setReduced(query.matches);
    document.addEventListener("visibilitychange", visibility);
    query.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      query.removeEventListener("change", motion);
    };
  }, [released]);
  useEffect(() => {
    video.current?.load();
  }, [released]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    if (released) {
      element.pause();
    } else if (visible && !hidden && !reduced && !failed) {
      try {
        void element
          .play()
          .then(() => {
            if (!cancelled) setPlaying(true);
          })
          .catch((error: unknown) => {
            if (!cancelled) {
              setPreviewError(
                error instanceof Error ? error.name : "PlayError",
              );
              setFailed(true);
              setPlaying(false);
            }
          });
      } catch (error) {
        setPreviewError(error instanceof Error ? error.name : "PlayError");
        setFailed(true);
      }
    } else {
      element.pause();
      setPlaying(false);
    }
    return () => {
      cancelled = true;
      element.pause();
    };
  }, [released, visible, hidden, reduced, failed]);
  return (
    <div
      className="hero-preview-layer"
      data-playing={playing && !reduced && !failed}
      data-preview-error={previewError}
      data-preview-state={
        released
          ? "released"
          : failed
            ? "poster-error"
            : reduced
              ? "poster-reduced-motion"
              : hidden
                ? "paused-hidden"
                : !visible
                  ? "paused-offscreen"
                  : playing
                    ? "playing"
                    : "starting"
      }
    >
      <img
        className="hero-preview-poster"
        src={heroPreview.poster.href}
        alt=""
        aria-hidden="true"
      />
      <video
        ref={video}
        className="hero-preview"
        muted
        loop
        playsInline
        preload="metadata"
        poster={heroPreview.poster.href}
        aria-hidden="true"
        tabIndex={-1}
        onError={() => {
          setPreviewError(
            `MediaError:${video.current?.error?.code ?? "unknown"}`,
          );
          setFailed(true);
          setPlaying(false);
          video.current?.pause();
        }}
      >
        {!released && (
          <>
            {/* MP4 first: smaller here, and Chromium 152 fails to decode this WebM. */}
            <source src={heroPreview.mp4.href} type="video/mp4" />
            <source src={heroPreview.webm.href} type="video/webm" />
          </>
        )}
      </video>
    </div>
  );
}
function DemoPoster({ phase }: { phase: DemoPhase }) {
  const unavailable = phase === "unavailable";
  return (
    <div className="demo-poster">
      {unavailable && demoVideoHref ? (
        <a
          className="button secondary demo-video-fallback"
          href={demoVideoHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch the demo video
        </a>
      ) : null}
    </div>
  );
}
export function DemoStage({
  darkMode = false,
  onLive,
  onStop,
  onPhaseChange,
  focusReturnId,
}: {
  darkMode?: boolean;
  onLive?: () => void;
  onStop?: () => void;
  onPhaseChange?: (phase: DemoPhase) => void;
  focusReturnId?: string;
}) {
  const [phase, setPhase] = useState<DemoPhase>("poster");
  const [attempt, setAttempt] = useState(0);
  const [frameVisible, setFrameVisible] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const [released, setReleased] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingStrike = useRef(false);
  const listenerReady = useRef(false);
  const phaseRef = useRef(phase);
  const attemptRef = useRef(0);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTransition = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);
  useEffect(
    () => () => {
      attemptRef.current++;
      clearTransition();
    },
    [clearTransition],
  );
  const markUnavailable = useCallback(() => {
    attemptRef.current++;
    clearTransition();
    phaseRef.current = "unavailable";
    pendingStrike.current = false;
    listenerReady.current = false;
    setFrameVisible(false);
    setControlsReady(false);
    setReleased(false);
    setPhase("unavailable");
    onStop?.();
  }, [clearTransition, onStop]);
  const start = useCallback(
    (strike: boolean) => {
      const current = phaseRef.current;
      if (current === "unavailable") return;
      if (current === "live") {
        if (strike) window.dispatchEvent(new Event(DESTRUCTION_USE_TOOL_EVENT));
        return;
      }
      if (strike) pendingStrike.current = true;
      if (current === "poster") {
        if (!supportsWebGL()) markUnavailable();
        else {
          const next = ++attemptRef.current;
          setAttempt(next);
          phaseRef.current = "loading";
          setPhase("loading");
        }
      }
    },
    [markUnavailable],
  );
  useEffect(() => {
    const request = () => start(true);
    window.addEventListener(DEMO_PLAY_REQUEST_EVENT, request);
    return () => window.removeEventListener(DEMO_PLAY_REQUEST_EVENT, request);
  }, [start]);
  const handleMounted = useCallback(() => {
    if (attempt !== attemptRef.current || phaseRef.current !== "loading")
      return;
    listenerReady.current = true;
    if (pendingStrike.current) {
      pendingStrike.current = false;
      window.dispatchEvent(new Event(DESTRUCTION_USE_TOOL_EVENT));
    }
  }, [attempt]);
  const handleControlsReady = useCallback(() => {
    if (
      attempt === attemptRef.current &&
      phaseRef.current !== "poster" &&
      phaseRef.current !== "unavailable"
    )
      setControlsReady(true);
  }, [attempt]);
  const handleFirstFrame = useCallback(() => {
    if (attempt !== attemptRef.current || phaseRef.current !== "loading")
      return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (attempt !== attemptRef.current || phaseRef.current !== "loading")
        return;
      phaseRef.current = "live";
      setPhase("live");
      setFrameVisible(true);
      if (
        stageRef.current?.contains(document.activeElement) ||
        document.activeElement?.getAttribute("aria-controls") ===
          "interactive-demo"
      )
        stageRef.current?.focus({ preventScroll: true });
      onLive?.();
      if (listenerReady.current && pendingStrike.current) {
        pendingStrike.current = false;
        window.dispatchEvent(new Event(DESTRUCTION_USE_TOOL_EVENT));
      }
      const finish = () => {
        if (attempt === attemptRef.current && phaseRef.current === "live")
          setReleased(true);
      };
      if (window.matchMedia(motionQuery).matches) finish();
      else
        timer.current = setTimeout(finish, motionTokens.duration.normal * 1000);
    });
  }, [attempt, onLive]);
  const stop = useCallback(
    (continueDown = false) => {
      const restoreFocus = stageRef.current?.contains(document.activeElement);
      const stoppedAttempt = ++attemptRef.current;
      clearTransition();
      pendingStrike.current = false;
      listenerReady.current = false;
      phaseRef.current = "poster";
      setPhase("poster");
      setFrameVisible(false);
      setControlsReady(false);
      setReleased(false);
      onStop?.();
      raf.current = requestAnimationFrame(() => {
        if (stoppedAttempt !== attemptRef.current) return;
        if (continueDown) {
          const projects = document.getElementById("projects");
          const heading =
            projects?.querySelector<HTMLElement>("h2") ?? projects;
          heading?.setAttribute("tabindex", "-1");
          heading?.focus({ preventScroll: true });
          if (projects && document.activeElement !== heading) {
            projects.tabIndex = -1;
            if (
              !projects.hasAttribute("aria-label") &&
              !projects.hasAttribute("aria-labelledby")
            )
              projects.setAttribute(
                "aria-label",
                heading?.textContent?.trim() || "Projects",
              );
            projects.focus({ preventScroll: true });
          }
          history.replaceState(null, "", "#projects");
          projects?.scrollIntoView({
            behavior: window.matchMedia(motionQuery).matches
              ? "auto"
              : "smooth",
          });
        } else if (restoreFocus)
          (
            (focusReturnId ? document.getElementById(focusReturnId) : null) ??
            stageRef.current?.querySelector<HTMLButtonElement>(
              ".demo-video-fallback",
            )
          )?.focus({ preventScroll: true });
      });
    },
    [clearTransition, focusReturnId, onStop],
  );
  const requested = phase === "loading" || phase === "live";
  return (
    <div
      ref={stageRef}
      id="interactive-demo"
      className="demo-stage"
      data-phase={phase}
      data-frame-visible={frameVisible}
      tabIndex={-1}
      aria-label="Interactive destruction demo"
    >
      <DemoPreview released={released} />
      {requested && (
        <div
          className="demo-interactive-layer"
          data-liquid-ignore="true"
          key={attempt}
        >
          <DemoLoadBoundary
            onError={() => {
              if (attempt === attemptRef.current) markUnavailable();
            }}
          >
            <Suspense fallback={null}>
              <DestructionLab
                darkMode={darkMode}
                onUnavailable={() => {
                  if (attempt === attemptRef.current) markUnavailable();
                }}
                onFirstFrame={handleFirstFrame}
                onControlsReady={handleControlsReady}
              />
              <LabMounted onMounted={handleMounted} />
            </Suspense>
          </DemoLoadBoundary>
        </div>
      )}
      {phase !== "live" && <DemoPoster phase={phase} />}
      {requested && (
        <div className="demo-session-controls" data-liquid-ignore="true">
          <span
            className="demo-zoom-hint"
            aria-label="Mouse wheel zooms; drag orbits; right-drag pans. Two fingers pinch and pan on touch."
          >
            {phase === "live" && controlsReady
              ? "Scroll to zoom · Drag to orbit"
              : "Preparing interactive scene"}
          </span>
          <button
            className="button secondary"
            type="button"
            onClick={() => stop()}
          >
            <Square aria-hidden="true" />
            Stop demo
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => stop(true)}
          >
            <ArrowDown aria-hidden="true" />
            Continue down
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {phase === "loading"
          ? "Loading the interactive demo."
          : phase === "live"
            ? "Interactive demo loaded."
            : phase === "unavailable"
              ? "Interactive demo unavailable. Portfolio content remains available."
              : ""}
      </p>
    </div>
  );
}

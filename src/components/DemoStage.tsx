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
import { Play } from "lucide-react";
import { demoVideoHref } from "@/content/demo";
import {
  DEMO_PLAY_REQUEST_EVENT,
  DESTRUCTION_USE_TOOL_EVENT,
} from "@/lib/events";

// Three.js, Rapier and the scene stay out of the initial bundle until a visitor
// asks for the demo.
const DestructionLab = lazy(() =>
  import("@/components/DestructionLab").then((module) => ({
    default: module.DestructionLab,
  })),
);

export type DemoPhase = "poster" | "loading" | "live" | "unavailable";

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
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

// Rendered after the lab inside the same Suspense boundary, so its effect runs
// after the lab's effects have registered the tool-event listener.
function LabMounted({ onMounted }: { onMounted: () => void }) {
  useEffect(() => {
    onMounted();
  }, [onMounted]);
  return null;
}

function DemoPoster({
  phase,
  onPlay,
}: {
  phase: DemoPhase;
  onPlay: () => void;
}) {
  const unavailable = phase === "unavailable";
  const loading = phase === "loading";
  return (
    <div className="demo-poster">
      <div className="demo-poster-card">
        <span className="demo-poster-label">Interactive web prototype</span>
        <strong>Real-time building destruction</strong>
        <p>
          {unavailable
            ? "This browser or device cannot run the WebGL scene. The rest of the portfolio works normally."
            : "Three.js and Rapier physics in the browser. The 3D scene downloads when you start it."}
        </p>
        {unavailable ? (
          demoVideoHref ? (
            <a
              className="button secondary"
              href={demoVideoHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch the demo video
            </a>
          ) : null
        ) : (
          <button
            className="button primary"
            type="button"
            onClick={onPlay}
            disabled={loading}
            aria-busy={loading}
          >
            <Play aria-hidden="true" />{" "}
            {loading ? "Loading demo…" : "Play interactive demo"}
          </button>
        )}
      </div>
    </div>
  );
}

export function DemoStage({
  darkMode = false,
  onLive,
}: {
  darkMode?: boolean;
  onLive?: () => void;
}) {
  const [phase, setPhase] = useState<DemoPhase>("poster");
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingStrike = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const markUnavailable = useCallback(() => {
    phaseRef.current = "unavailable";
    pendingStrike.current = false;
    setPhase("unavailable");
  }, []);

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
        else setPhase("loading");
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
    // A child can report failure in the same commit, before this effect runs.
    if (phaseRef.current !== "loading") return;
    phaseRef.current = "live";
    // Keep keyboard focus inside the stage when the poster button disappears.
    if (stageRef.current?.contains(document.activeElement)) {
      stageRef.current.focus({ preventScroll: true });
    }
    setPhase("live");
    onLive?.();
    if (pendingStrike.current) {
      pendingStrike.current = false;
      window.dispatchEvent(new Event(DESTRUCTION_USE_TOOL_EVENT));
    }
  }, [onLive]);

  const labRequested = phase === "loading" || phase === "live";
  return (
    <div
      ref={stageRef}
      id="interactive-demo"
      className="demo-stage"
      data-phase={phase}
      tabIndex={-1}
      aria-label="Interactive destruction demo"
    >
      {labRequested ? (
        <DemoLoadBoundary onError={markUnavailable}>
          <Suspense fallback={null}>
            <DestructionLab
              darkMode={darkMode}
              onUnavailable={markUnavailable}
            />
            <LabMounted onMounted={handleMounted} />
          </Suspense>
        </DemoLoadBoundary>
      ) : null}
      {phase !== "live" ? (
        <DemoPoster phase={phase} onPlay={() => start(false)} />
      ) : null}
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

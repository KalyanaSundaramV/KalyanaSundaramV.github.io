/// <reference types="vite/client" />
import {
  lazy,
  Suspense,
  type ComponentType,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileText,
  Gamepad2,
  Laptop,
  Layers3,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Menu,
  Moon,
  Play,
  Rocket,
  Sun,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import {
  PortfolioArtwork,
  ProjectArtwork,
} from "@/components/art/PortfolioArtwork";
import { PageCursor } from "@/components/PageCursor";
import { LiquidGlass } from "@/components/glass/LiquidGlass";
import { DemoStage, type DemoPhase } from "@/components/DemoStage";
import { LayeredGlassAsset } from "@/components/glass/LayeredGlassAsset";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { DetailDialog } from "@/components/detail/DetailDialog";
import {
  QuickLook,
  QuickLookButton,
  quickLookId,
  type QuickLookState,
} from "@/components/detail/QuickLook";
import { learningEntries } from "@/content/learning";
import { ownerAssets } from "@/content/ownerAssets";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { ludoTimeline, resume } from "@/content/resume";
import {
  gameSystems,
  standaloneToolProjectSlugs,
  toolGroups,
  tools,
} from "@/content/tools";
import { useSectionObserver } from "@/hooks/useSectionObserver";
import {
  createDetailViewModel,
  learningDetail,
  suiteDetail,
  systemDetail,
  timelineLearningDetail,
  utilityDetail,
  type ActiveDetail,
  type ToolDetail,
} from "@/lib/detail";
import { DEMO_PLAY_REQUEST_EVENT } from "@/lib/events";
import { motionTokens, revealPresets } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const navItems = [
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Tools", href: "#tools" },
  { label: "Experience", href: "#experience" },
  { label: "Learning", href: "#learning" },
  { label: "Resume", href: "#resume" },
  { label: "Contact", href: "#contact" },
];

const observedSectionIds = [
  "home",
  "projects",
  "about",
  "tools",
  "experience",
  "resume",
  "learning",
  "contact",
];

type Capability = {
  title: string;
  detail: string;
  icon: ComponentType<{ size?: number }>;
  projectSlugs: string[];
  explanation: string;
  proofPoints: string[];
  technologies: string[];
};

const capabilities: Capability[] = [
  {
    title: "Gameplay systems",
    detail: "Mechanics, AI, progression, economy, multiplayer",
    icon: Gamepad2,
    projectSlugs: ["ludo-demolition", "cube-kingdom", "ludo-hero"],
    explanation:
      "Gameplay capability is shown through shipped and prototype loops: dice outcomes, demolition tools, contracts, mobile progression, and team-game feature work.",
    proofPoints: [
      "Ludo Demolition connects deterministic dice, tool impacts, contracts, economy, and UI presenters into one playable prototype loop.",
      "Cube Kingdom and Ludo Hero give the portfolio shipped mobile and team-project context beyond a single current prototype.",
    ],
    technologies: ["Unity", "C#", "Gameplay loops", "Economy", "Multiplayer"],
  },
  {
    title: "Procedural generation",
    detail: "Settlements, roads, levels, content, validation",
    icon: Box,
    projectSlugs: ["ludo-demolition"],
    explanation:
      "The procedural work is visible in Ludo Demolition's settlement planner and the browser destruction world, where roads, parcels, environment actors, and destruction buffers are planned together.",
    proofPoints: [
      "The settlement planner reserves roads, yards, collapse space, blast zones, traffic routes, and readable building parcels from deterministic seeds.",
      "The portfolio's 3D districts reuse those ideas to keep generated surrounding buildings on road frontage without collisions.",
    ],
    technologies: [
      "Unity",
      "Three.js",
      "Deterministic seeds",
      "Spatial validation",
    ],
  },
  {
    title: "Unity editor tooling",
    detail: "Custom editors, pipelines, automation, diagnostics",
    icon: Wrench,
    projectSlugs: ["ludo-demolition"],
    explanation:
      "Editor tooling capability is represented by reusable authoring suites for UI production, tool effects, building setup, road generation, validation, and build evidence.",
    proofPoints: [
      "The UI and popup pipeline generates repeatable runtime-ready screens and catalogs instead of relying on manual prefab wiring.",
      "Building, fracture, road, diagnostic, and release tools turn common production chores into inspectable editor workflows.",
    ],
    technologies: ["Unity Editor", "C#", "Custom inspectors", "Automation"],
  },
  {
    title: "Native applications",
    detail: "Windows and Android productivity products",
    icon: Laptop,
    projectSlugs: [
      "project-pulse",
      "wallpaper-workbench",
      "civitai-asset-manager",
      "money-planner",
    ],
    explanation:
      "Native application capability comes from standalone Windows and Android products with local data, search, scheduling, media handling, and workflow-focused interfaces.",
    proofPoints: [
      "ProjectPulse, Wallpaper Workbench, and Civitai Asset Manager show native Windows product architecture outside game engines.",
      "Money Planner adds Android and local-first personal productivity context with privacy-sensitive data boundaries.",
    ],
    technologies: [".NET", "WinUI", "SQLite", "Android", "Local-first data"],
  },
  {
    title: "Rapid prototyping",
    detail: "Playable proofs, vertical slices, technical demos",
    icon: Rocket,
    projectSlugs: ["ludo-demolition", "project-pulse", "wallpaper-workbench"],
    explanation:
      "Rapid prototyping shows up as working slices that prove a loop first, then expose what still needs media, packaging, validation, or production hardening.",
    proofPoints: [
      "The portfolio documents current state honestly: playable slices, validation notes, and next proof points stay visible.",
      "The interactive browser demolition lab demonstrates a compact technical proof while the full Unity project continues separately.",
    ],
    technologies: ["React", "Three.js", "Unity", "Product prototypes"],
  },
];

type ToolsView = "products" | "editor" | "systems";

function detailKey(detail: ActiveDetail) {
  return `${detail.kind}:${detail.item.slug}`;
}

function fallbackDetailFocus(detail: ActiveDetail | null) {
  if (!detail) return null;
  const section = document.getElementById(
    detail.kind === "project"
      ? "projects"
      : detail.kind === "learning"
        ? "learning"
        : "tools",
  );
  const target = section?.querySelector<HTMLElement>("h2") ?? section;
  target?.setAttribute("tabindex", "-1");
  return target;
}

function clampTextScale(value: number) {
  return Math.min(1.25, Math.max(0.95, value));
}

function capabilityDetail(capability: Capability): ActiveDetail {
  const relatedProjects = capability.projectSlugs
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project) => project !== undefined);
  const relatedProjectNames = relatedProjects
    .map((project) => project.name)
    .join(", ");
  const item: ToolDetail = {
    slug: `capability-${capability.title.toLowerCase().replace(/\W+/g, "-")}`,
    category: "Capability",
    title: capability.title,
    status: "Project-backed",
    summary: capability.explanation,
    problem:
      "A portfolio capability needs to connect to concrete work instead of reading like a generic skill label.",
    solution: capability.explanation,
    result: relatedProjectNames
      ? `This capability is represented in ${relatedProjectNames}.`
      : "This capability is represented in the documented portfolio work.",
    technologies: capability.technologies,
    detail: {
      scope: `Explains how ${capability.title.toLowerCase()} appears across my documented projects and tool systems.`,
      constraints: [
        "The explanation stays public-safe and avoids private source, credentials, unreleased commercial material, or former-employer implementation details.",
        "Project evidence is described only at the level currently documented in the portfolio.",
      ],
      engineeringHighlights: capability.proofPoints,
      proofPoints: relatedProjects.map(
        (project) => `${project.name}: ${project.summary.replace(/\.$/, "")}.`,
      ),
      disclosure:
        "Capability cards summarize evidence that is already present in the portfolio content model.",
    },
  };
  return { kind: "tool", item };
}

function SectionHeading({
  number,
  title,
  action,
}: {
  number: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <LayeredGlassAsset
      asset="section_header_bar"
      className="section-heading-glass"
      contentClassName="section-heading"
      data-reveal="fade-right"
    >
      <div>
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </LayeredGlassAsset>
  );
}

const pipelineStages = [
  {
    title: "Input",
    items: ["User action", "Environment", "Physics events", "AI triggers"],
  },
  {
    title: "Data",
    items: ["Geometry", "Material data", "Constraints", "Damage fields"],
  },
  {
    title: "Simulation core",
    items: ["Fracture", "Forces", "State", "Time iteration"],
    core: true,
  },
  {
    title: "Rendering",
    items: ["Fragments", "Particles / dust", "Shadows / GI", "Post process"],
  },
  {
    title: "Output",
    items: [
      "Visual feedback",
      "Debris fields",
      "Audio cues",
      "Gameplay impact",
    ],
  },
];

function DestructionPipeline() {
  return (
    <LayeredGlassAsset
      asset="pipeline_panel"
      className="pipeline-glass"
      contentClassName="destruction-pipeline"
      data-reveal="fade-left"
      data-parallax
    >
      <div className="pipeline-heading">
        <span className="pipeline-mark">
          <Box aria-hidden="true" />
        </span>
        <strong>
          Core system: <em>destruction pipeline</em>
        </strong>
      </div>
      <div className="pipeline-flow">
        <svg
          className="pipeline-connectors"
          viewBox="0 0 1000 180"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M 170 90 H 230" />
          <path d="M 370 90 H 430" />
          <path d="M 570 90 H 630" />
          <path d="M 770 90 H 830" />
        </svg>
        {pipelineStages.map((stage) => (
          <div
            className={`pipeline-stage${stage.core ? " pipeline-stage-core" : ""}`}
            data-pipeline-node
            key={stage.title}
          >
            <span>{stage.title}</span>
            {stage.core ? (
              <div className="pipeline-core-art" aria-hidden="true">
                <Box />
              </div>
            ) : null}
            <div>
              {stage.items.map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        className="pipeline-tags"
        aria-label="Destruction pipeline disciplines"
      >
        {[
          "Chunking",
          "Fracturing",
          "Physics",
          "Debris",
          "Optimization",
          "Tools",
        ].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </LayeredGlassAsset>
  );
}

const HomesteadCapture = lazy(() =>
  import("@/components/DestructionLab").then((module) => ({
    default: module.HomesteadCapture,
  })),
);

export default function App() {
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("capture") === "homestead"
  ) {
    return (
      <Suspense fallback={null}>
        <HomesteadCapture />
      </Suspense>
    );
  }
  return <Portfolio />;
}

function Portfolio() {
  const pageRef = useRef<HTMLDivElement>(null);
  const projectTrackRef = useRef<HTMLDivElement>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const activeDetailRef = useRef<ActiveDetail | null>(null);
  const closedDetailRef = useRef<ActiveDetail | null>(null);
  const quickLookTimerRef = useRef<number | null>(null);
  const quickLookCloseTimerRef = useRef<number | null>(null);
  const quickLookDismissedRef = useRef<string | null>(null);
  const quickLookPointerFocusRef = useRef<HTMLElement | null>(null);
  const quickLookSuppressFocusRef = useRef<HTMLElement | null>(null);
  const detailRestoreTokenRef = useRef(0);
  const detailBlocksQuickLookRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoLive, setDemoLive] = useState(false);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("poster");
  const [introHidden, setIntroHidden] = useState(false);
  // On desktop the intro panel covers the demo, so it steps aside once the
  // demo is running; the toggle brings it back.
  const handleDemoLive = useCallback(() => {
    setDemoLive(true);
    if (window.matchMedia("(min-width: 961px)").matches) setIntroHidden(true);
  }, []);
  const handleDemoStop = useCallback(() => {
    setDemoLive(false);
    setIntroHidden(false);
  }, []);
  const handleHeroPlay = useCallback(() => {
    if (demoPhase === "loading" || demoPhase === "unavailable") return;
    window.dispatchEvent(new Event(DEMO_PLAY_REQUEST_EVENT));
  }, [demoPhase]);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (
      typeof document !== "undefined" &&
      document.documentElement.dataset.theme === "dark"
    ) {
      return "dark";
    }
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("kalyan-portfolio-theme");
      if (stored === "dark" || stored === "light") return stored;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches)
        return "dark";
    }
    return "light";
  });
  const [activeDetail, setActiveDetail] = useState<ActiveDetail | null>(null);
  const [quickLook, setQuickLook] = useState<QuickLookState | null>(null);
  const [toolsView, setToolsView] = useState<ToolsView>("products");
  const [activeToolGroup, setActiveToolGroup] = useState(toolGroups[0].slug);
  const [textScale, setTextScale] = useState(() => {
    if (typeof window === "undefined") return 1;
    const stored = Number.parseFloat(
      window.localStorage.getItem("kalyan-portfolio-text-scale") ?? "",
    );
    return Number.isFinite(stored) ? clampTextScale(stored) : 1;
  });

  const activeSection = useSectionObserver(observedSectionIds);
  const demoLoading = demoPhase === "loading";
  const demoUnavailable = demoPhase === "unavailable";
  const heroDemoStatus = demoLoading
    ? "Loading the interactive demo."
    : demoUnavailable
      ? "The interactive demo is unavailable on this device."
      : "";

  const standaloneProducts = useMemo(
    () =>
      projects.filter((project) =>
        standaloneToolProjectSlugs.includes(project.slug),
      ),
    [],
  );
  const activeGroup = useMemo(
    () => toolGroups.find((group) => group.slug === activeToolGroup)!,
    [activeToolGroup],
  );
  const documentedMetrics = useMemo(
    () => [
      { label: "Documented projects", value: projects.length },
      {
        label: "Editor utilities",
        value: toolGroups.reduce(
          (total, group) => total + group.tools.length,
          0,
        ),
      },
      { label: "Game systems", value: gameSystems.length },
      {
        label: "Learning notes",
        value: learningEntries.length + ludoTimeline.length,
      },
    ],
    [],
  );

  const clearQuickLookTimer = useCallback(() => {
    if (quickLookTimerRef.current === null) return;
    window.clearTimeout(quickLookTimerRef.current);
    quickLookTimerRef.current = null;
  }, []);

  const clearQuickLookCloseTimer = useCallback(() => {
    if (quickLookCloseTimerRef.current === null) return;
    window.clearTimeout(quickLookCloseTimerRef.current);
    quickLookCloseTimerRef.current = null;
  }, []);

  const openDetail = useCallback(
    (detail: ActiveDetail, trigger?: HTMLElement) => {
      detailRestoreTokenRef.current++;
      detailBlocksQuickLookRef.current = true;
      closedDetailRef.current = null;
      clearQuickLookTimer();
      clearQuickLookCloseTimer();
      detailTriggerRef.current =
        trigger ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      setQuickLook(null);
      setActiveDetail(detail);
    },
    [clearQuickLookCloseTimer, clearQuickLookTimer],
  );

  const closeDetail = useCallback(() => {
    detailRestoreTokenRef.current++;
    detailBlocksQuickLookRef.current = true;
    closedDetailRef.current = activeDetailRef.current;
    clearQuickLookTimer();
    clearQuickLookCloseTimer();
    setQuickLook(null);
    setActiveDetail(null);
  }, [clearQuickLookCloseTimer, clearQuickLookTimer]);

  const closeQuickLook = useCallback(
    (dismiss = false) => {
      clearQuickLookTimer();
      clearQuickLookCloseTimer();
      if (dismiss && quickLook)
        quickLookDismissedRef.current = detailKey(quickLook.detail);
      setQuickLook(null);
    },
    [clearQuickLookCloseTimer, clearQuickLookTimer, quickLook],
  );

  const scheduleDesktopQuickLookClose = useCallback(() => {
    clearQuickLookTimer();
    clearQuickLookCloseTimer();
    quickLookCloseTimerRef.current = window.setTimeout(() => {
      quickLookCloseTimerRef.current = null;
      setQuickLook((current) => (current?.mode === "desktop" ? null : current));
    }, 120);
  }, [clearQuickLookCloseTimer, clearQuickLookTimer]);

  const showQuickLook = useCallback(
    (
      detail: ActiveDetail,
      anchor: HTMLElement,
      mode: QuickLookState["mode"],
      delay = 0,
    ) => {
      if (activeDetail || detailBlocksQuickLookRef.current) return;
      if (quickLookDismissedRef.current === detailKey(detail)) return;
      clearQuickLookTimer();
      clearQuickLookCloseTimer();
      const commit = () => {
        quickLookTimerRef.current = null;
        if (activeDetailRef.current || detailBlocksQuickLookRef.current) return;
        setQuickLook({ detail, anchor, mode });
      };
      if (delay === 0) commit();
      else quickLookTimerRef.current = window.setTimeout(commit, delay);
    },
    [activeDetail, clearQuickLookCloseTimer, clearQuickLookTimer],
  );

  const openMobileQuickLook = useCallback(
    (detail: ActiveDetail, anchor: HTMLElement) => {
      clearQuickLookTimer();
      setQuickLook((current) =>
        current?.mode === "mobile" &&
        detailKey(current.detail) === detailKey(detail)
          ? null
          : { detail, anchor, mode: "mobile" },
      );
    },
    [clearQuickLookTimer],
  );

  const quickLookBindings = (detail: ActiveDetail) => {
    const active =
      quickLook && detailKey(quickLook.detail) === detailKey(detail);
    return {
      "aria-describedby": active ? quickLookId(detail) : undefined,
      onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          return;
        }
        quickLookDismissedRef.current = null;
        clearQuickLookCloseTimer();
        showQuickLook(detail, event.currentTarget, "desktop", 180);
      },
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        quickLookPointerFocusRef.current = event.currentTarget;
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
        const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1);
        event.currentTarget.style.setProperty("--pointer-x", `${x - 0.5}`);
        event.currentTarget.style.setProperty("--pointer-y", `${y - 0.5}`);
      },
      onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
        event.currentTarget.style.removeProperty("--pointer-x");
        event.currentTarget.style.removeProperty("--pointer-y");
        quickLookPointerFocusRef.current = null;
        scheduleDesktopQuickLookClose();
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (quickLookSuppressFocusRef.current === event.currentTarget) {
          quickLookSuppressFocusRef.current = null;
          return;
        }
        if (quickLookPointerFocusRef.current === event.currentTarget) return;
        quickLookDismissedRef.current = null;
        showQuickLook(detail, event.currentTarget, "desktop");
      },
      onBlur: () => {
        scheduleDesktopQuickLookClose();
      },
    };
  };

  const isMobileQuickLookOpen = (detail: ActiveDetail) =>
    quickLook?.mode === "mobile" &&
    detailKey(quickLook.detail) === detailKey(detail);

  useEffect(() => {
    activeDetailRef.current = activeDetail;
  }, [activeDetail]);

  useEffect(() => {
    return () => {
      clearQuickLookTimer();
      clearQuickLookCloseTimer();
    };
  }, [clearQuickLookCloseTimer, clearQuickLookTimer]);

  const restoreDetailFocus = useCallback(() => {
    const token = detailRestoreTokenRef.current;
    const trigger = detailTriggerRef.current;
    const target =
      trigger?.isConnected === true
        ? trigger
        : fallbackDetailFocus(closedDetailRef.current);
    if (!target) {
      detailBlocksQuickLookRef.current = false;
      return;
    }
    quickLookSuppressFocusRef.current = target;
    window.requestAnimationFrame(() => {
      if (token !== detailRestoreTokenRef.current) return;
      target.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        if (quickLookSuppressFocusRef.current === target) {
          quickLookSuppressFocusRef.current = null;
        }
        if (token === detailRestoreTokenRef.current) {
          detailBlocksQuickLookRef.current = false;
        }
      });
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setHeaderScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("kalyan-portfolio-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#000000" : "#f6f6f4");
  }, [theme]);

  useEffect(() => {
    const value = textScale.toFixed(2);
    document.documentElement.style.setProperty("--portfolio-text-scale", value);
    window.localStorage.setItem("kalyan-portfolio-text-scale", value);
  }, [textScale]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (
        pageRef.current
          ?.querySelector(".mobile-menu")
          ?.contains(document.activeElement)
      ) {
        pageRef.current
          .querySelector<HTMLButtonElement>(".mobile-menu-button")
          ?.focus({ preventScroll: true });
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      closeQuickLook();
    };
    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, [closeQuickLook]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const revealFrom = {
        "fade-up": revealPresets.fadeUp,
        "fade-down": revealPresets.fadeDown,
        "fade-left": revealPresets.fadeLeft,
        "fade-right": revealPresets.fadeRight,
        "scale-in": revealPresets.scaleIn,
        "blur-in": revealPresets.blurIn,
      };

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        const kind = element.dataset.reveal as
          keyof typeof revealFrom | undefined;
        const from = revealFrom[kind ?? "fade-up"] ?? revealPresets.fadeUp;
        gsap.fromTo(element, from, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: motionTokens.duration.section,
          ease: motionTokens.ease.gsapReveal,
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });

      gsap
        .timeline({ defaults: { ease: motionTokens.ease.gsapReveal } })
        .fromTo(
          ".site-header",
          { autoAlpha: 0, y: -22, filter: "blur(8px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.52 },
        )
        .fromTo(
          ".hero-copy-glass",
          { autoAlpha: 0, y: 28, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.62 },
          "-=0.3",
        )
        .fromTo(
          "[data-hero-line]",
          { yPercent: 115, filter: "blur(6px)" },
          {
            yPercent: 0,
            filter: "blur(0px)",
            duration: 0.66,
            stagger: 0.09,
          },
          "-=0.48",
        )
        .fromTo(
          "[data-hero-support]",
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 },
          "-=0.36",
        )
        .fromTo(
          ".hero-demo-glass",
          { autoAlpha: 0, scale: 0.985 },
          { autoAlpha: 1, scale: 1, duration: 0.72 },
          "-=0.64",
        );

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
        gsap.fromTo(
          element,
          { yPercent: -4 },
          {
            yPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          },
        );
      });

      // Scroll drift for the hero copy. It uses explicit start values and
      // transform channels the intro never touches (x, yPercent), and no
      // opacity. A plain gsap.to() captured the intro's hidden starting state
      // (autoAlpha 0) and replayed it whenever the page returned to the top.
      gsap.fromTo(
        ".hero-copy-glass",
        { x: 0, yPercent: 0 },
        {
          x: -34,
          yPercent: -3.5,
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom 28%",
            scrub: 0.65,
          },
        },
      );

      const desktop = gsap.matchMedia();
      desktop.add("(min-width: 900px)", () => {
        gsap.fromTo(
          ".tools-workspace",
          { rotateX: 5, transformPerspective: 1200 },
          {
            rotateX: 0,
            ease: "none",
            scrollTrigger: {
              trigger: "#tools",
              start: "top 78%",
              end: "center center",
              scrub: 0.8,
            },
          },
        );
      });
      return () => desktop.revert();
    },
    { scope: pageRef },
  );

  useEffect(() => {
    // Below 961px the intro stacks above the demo, so it must be visible.
    const desktop = window.matchMedia("(min-width: 961px)");
    const reset = () => {
      if (!desktop.matches) setIntroHidden(false);
    };
    desktop.addEventListener("change", reset);
    return () => desktop.removeEventListener("change", reset);
  }, []);

  useEffect(() => {
    if (!demoLive) {
      const panel =
        pageRef.current?.querySelector<HTMLElement>(".hero-copy-glass");
      if (panel) {
        gsap.killTweensOf(panel);
        gsap.set(panel, { clearProps: "opacity,visibility,transform" });
        panel.removeAttribute("inert");
      }
      return;
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // xPercent and autoAlpha: channels the scroll drift (x, yPercent) never
    // touches, and the intro has finished by the time the demo is live.
    gsap.to(".hero-copy-glass", {
      xPercent: introHidden ? -115 : 0,
      autoAlpha: introHidden ? 0 : 1,
      duration: reduce ? 0 : 0.55,
      ease: introHidden ? "power3.inOut" : "power3.out",
      overwrite: "auto",
    });
  }, [demoLive, introHidden]);

  const scrollProjects = (direction: -1 | 1) => {
    projectTrackRef.current?.scrollBy({
      left: direction * Math.min(window.innerWidth * 0.72, 620),
      behavior: "smooth",
    });
  };

  const contactHref = (kind: "role" | "project") => {
    const subject =
      kind === "role" ? "Role opportunity" : "Project collaboration";
    return `mailto:${profile.email ?? ""}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div
      className="portfolio-page"
      data-page-visible={pageVisible}
      ref={pageRef}
      style={
        {
          "--portfolio-bg-art": `url("${ownerAssets.artwork.background.src}")`,
        } as React.CSSProperties
      }
    >
      <PageCursor />
      <LiquidGlass
        menuOpen={menuOpen}
        detailOpen={Boolean(activeDetail)}
        theme={theme}
      />
      <header className="site-header" data-scrolled={headerScrolled}>
        <LayeredGlassAsset
          asset="nav_bar"
          className="nav-glass"
          contentClassName="nav-glass-content"
        >
          <a
            href="#home"
            className="wordmark"
            aria-label={`${profile.name}, home`}
          >
            {profile.name}
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const section = item.href.slice(1);
              const active = activeSection === section;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  data-active={active}
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
          <div className="header-actions">
            <label className="text-size-control">
              <span aria-hidden="true">Aa</span>
              <input
                type="range"
                min="0.95"
                max="1.25"
                step="0.05"
                value={textScale}
                aria-label="Text size"
                onChange={(event) =>
                  setTextScale(
                    clampTextScale(Number(event.currentTarget.value)),
                  )
                }
                style={
                  {
                    "--text-size-progress": `${((textScale - 0.95) / 0.3) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </label>
            <button
              type="button"
              className="icon-button theme-button"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={() =>
                setTheme((value) => (value === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? <Sun /> : <Moon />}
            </button>
            <button
              type="button"
              className="icon-button mobile-menu-button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </button>
          </div>
        </LayeredGlassAsset>
      </header>
      <div
        className="mobile-menu"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="mobile-menu-head">
          <div className="mobile-menu-head-content">
            <span className="wordmark">{profile.name}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            >
              <X />
            </button>
          </div>
        </div>
        <nav aria-label="Mobile navigation">
          {navItems.map((item, index) => (
            <a
              key={`${item.label}-mobile`}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ transitionDelay: `${100 + index * 55}ms` }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <main>
        <section id="home" className="hero-section">
          <div className="hero-ambient" aria-hidden="true">
            <i className="ambient-orange" />
            <i className="ambient-blue" />
            <i className="ambient-purple" />
          </div>
          <div
            className="hero-panel"
            data-intro={introHidden ? "hidden" : "shown"}
          >
            <LayeredGlassAsset
              asset="hero_demo_frame"
              className="hero-demo-glass"
              contentClassName="hero-demo-content"
            >
              <DemoStage
                darkMode={theme === "dark"}
                onLive={handleDemoLive}
                onStop={handleDemoStop}
                onPhaseChange={setDemoPhase}
                focusReturnId="hero-demo-play"
              />
            </LayeredGlassAsset>
            <LayeredGlassAsset
              asset="hero_text_panel"
              className="hero-copy-glass"
              contentClassName="hero-copy"
              id="hero-intro"
              inert={introHidden}
            >
              <p className="hero-eyebrow" data-hero-support>
                <span aria-hidden="true" /> {profile.role}
              </p>
              <h1 aria-label="I build games, tools, and systems.">
                {["I build", "Games,", "Tools, and", "Systems."].map(
                  (line, index) => (
                    <span className="hero-line-mask" key={line}>
                      <span
                        className={
                          index === 3 ? "hero-line-systems" : undefined
                        }
                        data-hero-line
                      >
                        {line.replace(".", "")}
                        {index === 3 ? <em>.</em> : null}
                      </span>
                    </span>
                  ),
                )}
              </h1>
              <p data-hero-support>
                I&apos;m {profile.name}. I build gameplay systems, developer
                tools, and rapid prototypes that are practical to test and
                extend.
              </p>
              <div className="hero-cta-row" data-hero-support>
                {profile.resumePdfHref ? (
                  <a
                    className="button secondary"
                    href={profile.resumePdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText aria-hidden="true" /> Resume (PDF)
                  </a>
                ) : null}
                <a className="button secondary" href="#projects">
                  View projects <ArrowRight />
                </a>
                <button
                  id="hero-demo-play"
                  className="button primary"
                  type="button"
                  aria-controls="interactive-demo"
                  aria-disabled={demoLoading || demoUnavailable}
                  aria-busy={demoLoading}
                  onClick={handleHeroPlay}
                >
                  <Play aria-hidden="true" />{" "}
                  {demoLoading
                    ? "Loading demo..."
                    : demoUnavailable
                      ? "Demo unavailable"
                      : "Play interactive demo"}
                </button>
              </div>
              {heroDemoStatus ? (
                <p className="hero-demo-status" data-hero-support>
                  {heroDemoStatus}
                </p>
              ) : null}
            </LayeredGlassAsset>
            {demoLive ? (
              <button
                type="button"
                className="icon-button hero-intro-toggle"
                aria-controls="hero-intro"
                aria-label={
                  introHidden ? "Show introduction" : "Hide introduction"
                }
                title={introHidden ? "Show introduction" : "Hide introduction"}
                onClick={() => setIntroHidden((hidden) => !hidden)}
              >
                {introHidden ? (
                  <PanelLeftOpen aria-hidden="true" />
                ) : (
                  <PanelLeftClose aria-hidden="true" />
                )}
              </button>
            ) : null}
          </div>
        </section>

        <section id="projects" className="page-section projects-section">
          <SectionHeading
            number="01"
            title="Selected work"
            action={
              <div className="carousel-actions">
                <button
                  type="button"
                  onClick={() => scrollProjects(-1)}
                  aria-label="Previous projects"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => scrollProjects(1)}
                  aria-label="Next projects"
                >
                  <ChevronRight />
                </button>
              </div>
            }
          />
          <div
            className="project-track"
            ref={projectTrackRef}
            data-reveal="fade-left"
          >
            {projects.map((project, index) => {
              const detail: ActiveDetail = {
                kind: "project",
                item: project,
              };
              return (
                <article className="project-card" key={project.slug}>
                  <LayeredGlassAsset
                    asset="project_card"
                    className="project-card-glass"
                    data-stagger-item
                  >
                    <button
                      className="project-card-action"
                      type="button"
                      {...quickLookBindings(detail)}
                      onClick={(event) =>
                        openDetail(detail, event.currentTarget)
                      }
                    >
                      <ProjectArtwork project={project} />
                      <span className="project-card-body">
                        <span className="project-card-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.engine} / {project.platform}
                        </small>
                        <span>{project.summary}</span>
                        <i>
                          Open case study <ArrowUpRight />
                        </i>
                      </span>
                    </button>
                  </LayeredGlassAsset>
                  <QuickLookButton
                    detail={detail}
                    expanded={isMobileQuickLookOpen(detail)}
                    onOpen={openMobileQuickLook}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section id="about" className="page-section about-section">
          <SectionHeading number="02" title="About" />
          <div className="about-grid">
            <LayeredGlassAsset
              asset="about_panel"
              className="about-copy-glass"
              contentClassName="about-copy"
              data-reveal="fade-right"
            >
              <span className="about-kicker">02 / About</span>
              <h3 aria-label="I'm a developer who loves systems.">
                I
                <span className="display-apostrophe" aria-hidden="true">
                  {"'"}
                </span>
                m a developer who loves systems.
              </h3>
              <p>{profile.about}</p>
              <p>{resume.summary}</p>
              <div className="identity-chips" aria-label="Professional focus">
                <span>
                  <Gamepad2 aria-hidden="true" /> Game developer
                </span>
                <span>
                  <Wrench aria-hidden="true" /> Tools engineer
                </span>
                <span>
                  <Workflow aria-hidden="true" /> System designer
                </span>
              </div>
              <div className="availability-line">
                <MapPin />
                <span>
                  Based in {profile.location}. Open to full-time roles and
                  selected collaborations.
                </span>
              </div>
            </LayeredGlassAsset>
            <DestructionPipeline />
          </div>
        </section>

        <section className="page-section capabilities-section">
          <SectionHeading number="03" title="Capabilities" />
          <div className="capability-grid" data-reveal="scale-in">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              const detail = capabilityDetail(capability);
              return (
                <LayeredGlassAsset
                  asset="capability_card"
                  className="capability-card-glass"
                  data-stagger-item
                  key={capability.title}
                >
                  <button
                    className="capability-card"
                    type="button"
                    {...quickLookBindings(detail)}
                    onClick={(event) => openDetail(detail, event.currentTarget)}
                  >
                    <Icon aria-hidden="true" />
                    <div>
                      <strong>{capability.title}</strong>
                      <span>{capability.detail}</span>
                    </div>
                    <ArrowUpRight aria-hidden="true" />
                  </button>
                </LayeredGlassAsset>
              );
            })}
          </div>
        </section>

        <section id="tools" className="page-section tools-section">
          <SectionHeading number="04" title="Tools I built" />
          <div
            className="segmented-control"
            role="tablist"
            aria-label="Tool categories"
            data-reveal="fade-right"
          >
            {(
              [
                ["products", "Standalone products"],
                ["editor", "Unity editor tools"],
                ["systems", "Game systems"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={toolsView === value}
                data-active={toolsView === value}
                onClick={() => {
                  closeQuickLook();
                  setToolsView(value);
                }}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="tools-workspace" data-reveal="scale-in">
            {toolsView === "products" ? (
              <div className="standalone-grid">
                {standaloneProducts.map((project) => {
                  const detail: ActiveDetail = {
                    kind: "project",
                    item: project,
                  };
                  return (
                    <div
                      className="standalone-product-shell"
                      key={project.slug}
                    >
                      <button
                        type="button"
                        className="standalone-product"
                        {...quickLookBindings(detail)}
                        onClick={(event) =>
                          openDetail(detail, event.currentTarget)
                        }
                      >
                        <ProjectArtwork project={project} />
                        <span>
                          <strong>{project.name}</strong>
                          <small>{project.summary}</small>
                        </span>
                        <ArrowUpRight />
                      </button>
                      <QuickLookButton
                        detail={detail}
                        expanded={isMobileQuickLookOpen(detail)}
                        onOpen={openMobileQuickLook}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {toolsView === "editor" ? (
              <div className="editor-tools-view">
                <div className="tool-suite-grid">
                  {tools.map((tool) => {
                    const detail: ActiveDetail = {
                      kind: "tool",
                      item: suiteDetail(tool),
                    };
                    const artwork = createDetailViewModel(detail).artwork;
                    return (
                      <article className="tool-suite-shell" key={tool.slug}>
                        <button
                          type="button"
                          className="tool-suite-card"
                          {...quickLookBindings(detail)}
                          onClick={(event) =>
                            openDetail(detail, event.currentTarget)
                          }
                        >
                          <PortfolioArtwork
                            variant={artwork}
                            label={tool.category}
                            compact
                          />
                          <span>{tool.category}</span>
                          <h3>{tool.title}</h3>
                          <p>{tool.solution}</p>
                          <small>{tool.result}</small>
                          <ArrowUpRight className="detail-open-icon" />
                        </button>
                        <QuickLookButton
                          detail={detail}
                          expanded={isMobileQuickLookOpen(detail)}
                          onOpen={openMobileQuickLook}
                        />
                      </article>
                    );
                  })}
                </div>
                <div className="utility-browser">
                  <div
                    className="utility-tabs"
                    role="tablist"
                    aria-label="Editor tool disciplines"
                  >
                    {toolGroups.map((group) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={group.slug === activeToolGroup}
                        data-active={group.slug === activeToolGroup}
                        onClick={() => {
                          closeQuickLook();
                          setActiveToolGroup(group.slug);
                        }}
                        key={group.slug}
                      >
                        {group.eyebrow}
                      </button>
                    ))}
                  </div>
                  <div className="utility-group" role="tabpanel">
                    <div>
                      <span>{activeGroup.eyebrow}</span>
                      <h3>{activeGroup.title}</h3>
                      <p>{activeGroup.description}</p>
                    </div>
                    <div className="utility-list">
                      {activeGroup.tools.map((tool) => {
                        const detail: ActiveDetail = {
                          kind: "tool",
                          item: utilityDetail(tool, activeGroup),
                        };
                        return (
                          <div className="utility-item-shell" key={tool.slug}>
                            <button
                              type="button"
                              className="utility-item"
                              {...quickLookBindings(detail)}
                              onClick={(event) =>
                                openDetail(detail, event.currentTarget)
                              }
                            >
                              <Wrench aria-hidden="true" />
                              <div>
                                <strong>{tool.title}</strong>
                                <span>{tool.description}</span>
                              </div>
                              <small>{tool.status}</small>
                              <ArrowUpRight className="detail-open-icon" />
                            </button>
                            <QuickLookButton
                              detail={detail}
                              expanded={isMobileQuickLookOpen(detail)}
                              onOpen={openMobileQuickLook}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {toolsView === "systems" ? (
              <div className="game-systems-grid">
                {gameSystems.map((system, index) => {
                  const detail: ActiveDetail = {
                    kind: "tool",
                    item: systemDetail(system),
                  };
                  const artwork = createDetailViewModel(detail).artwork;
                  return (
                    <article className="game-system-shell" key={system.slug}>
                      <button
                        type="button"
                        className="game-system-card"
                        {...quickLookBindings(detail)}
                        onClick={(event) =>
                          openDetail(detail, event.currentTarget)
                        }
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <PortfolioArtwork
                          variant={artwork}
                          label={system.category}
                          compact
                        />
                        {index % 3 === 0 ? (
                          <Workflow
                            className="system-card-icon"
                            aria-hidden="true"
                          />
                        ) : index % 3 === 1 ? (
                          <Layers3
                            className="system-card-icon"
                            aria-hidden="true"
                          />
                        ) : (
                          <Code2
                            className="system-card-icon"
                            aria-hidden="true"
                          />
                        )}
                        <strong>{system.title}</strong>
                        <small>{system.summary}</small>
                        <ArrowUpRight className="detail-open-icon" />
                      </button>
                      <QuickLookButton
                        detail={detail}
                        expanded={isMobileQuickLookOpen(detail)}
                        onOpen={openMobileQuickLook}
                      />
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <section id="experience" className="page-section experience-section">
          <SectionHeading number="05" title="Experience" />
          <div className="experience-metrics" data-reveal="scale-in">
            {documentedMetrics.map((metric) => (
              <LayeredGlassAsset
                asset="metric_card"
                className="experience-metric-glass"
                key={metric.label}
              >
                <AnimatedCounter value={metric.value} />
                <small>{metric.label}</small>
              </LayeredGlassAsset>
            ))}
          </div>
          <div className="experience-grid">
            <div className="experience-timeline" data-reveal>
              <h3>Project experience</h3>
              {projects.slice(0, 4).map((project) => (
                <article key={project.slug}>
                  <i />
                  <span>{project.status}</span>
                  <div>
                    <strong>{project.role}</strong>
                    <small>
                      {project.name} / {project.engine}
                    </small>
                  </div>
                </article>
              ))}
            </div>
            <div className="shipped-work" data-reveal>
              <h3>Documented work</h3>
              {projects.map((project) => {
                const detail: ActiveDetail = {
                  kind: "project",
                  item: project,
                };
                return (
                  <button
                    type="button"
                    key={project.slug}
                    {...quickLookBindings(detail)}
                    onClick={(event) => openDetail(detail, event.currentTarget)}
                  >
                    <Check /> {project.name}
                    <small>{project.platform}</small>
                  </button>
                );
              })}
            </div>
            <LayeredGlassAsset
              asset="resume_download_card"
              className="resume-panel-glass"
              contentClassName="resume-panel"
              data-reveal="fade-left"
            >
              <Briefcase />
              <h3>Detailed experience, skills, and education</h3>
              <p>
                Download a concise application resume or the extended CV. Public
                copies omit the phone number.
              </p>
              {profile.resumePdfHref ? (
                <a className="button primary" href={profile.resumePdfHref}>
                  One-page resume <Download />
                </a>
              ) : null}
              {profile.extendedResumePdfHref ? (
                <a className="button" href={profile.extendedResumePdfHref}>
                  Extended CV <FileText />
                </a>
              ) : null}
            </LayeredGlassAsset>
          </div>
          <div id="resume" className="resume-details" data-reveal>
            <div>
              <h3>Core skills</h3>
              <div className="skill-list">
                {resume.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
            <div>
              <h3>Experience and education</h3>
              {[
                ...resume.experience,
                ...resume.education,
                ...resume.achievements,
              ].map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <span>{item.date}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="learning" className="page-section learning-section">
          <SectionHeading number="06" title="Learning" />
          <div className="learning-grid">
            {learningEntries.map((entry, index) => {
              const detail: ActiveDetail = {
                kind: "learning",
                item: learningDetail(entry),
              };
              return (
                <article
                  className="learning-card-shell"
                  key={entry.slug}
                  data-reveal
                >
                  <button
                    type="button"
                    className="learning-card"
                    {...quickLookBindings(detail)}
                    onClick={(event) => openDetail(detail, event.currentTarget)}
                  >
                    <div className="learning-visual" aria-hidden="true">
                      <PortfolioArtwork
                        variant="learning"
                        label={entry.status}
                        compact
                      />
                      <Code2 />
                      <span>0{index + 1}</span>
                    </div>
                    <span>
                      {entry.status} / {entry.lastUpdated}
                    </span>
                    <h3>{entry.title}</h3>
                    <p>{entry.excerpt}</p>
                    <div className="learning-card-footer">
                      <small>Next: {entry.nextMilestone}</small>
                      <ArrowUpRight aria-hidden="true" />
                    </div>
                  </button>
                  <QuickLookButton
                    detail={detail}
                    expanded={isMobileQuickLookOpen(detail)}
                    onOpen={openMobileQuickLook}
                  />
                </article>
              );
            })}
            {ludoTimeline.map((item, index) => {
              const detail: ActiveDetail = {
                kind: "learning",
                item: timelineLearningDetail(item, index),
              };
              return (
                <article
                  className="learning-card-shell"
                  key={item.title}
                  data-reveal
                >
                  <button
                    type="button"
                    className="learning-card"
                    {...quickLookBindings(detail)}
                    onClick={(event) => openDetail(detail, event.currentTarget)}
                  >
                    <div className="learning-visual" aria-hidden="true">
                      <PortfolioArtwork
                        variant="learning"
                        label="Development log"
                        compact
                      />
                      <Workflow />
                      <span>0{index + learningEntries.length + 1}</span>
                    </div>
                    <span>Ludo Demolition / {item.date}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="learning-card-footer">
                      <small>Open development note</small>
                      <ArrowUpRight aria-hidden="true" />
                    </div>
                  </button>
                  <QuickLookButton
                    detail={detail}
                    expanded={isMobileQuickLookOpen(detail)}
                    onOpen={openMobileQuickLook}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section id="contact" className="page-section contact-section">
          <SectionHeading number="07" title="Contact" />
          <div className="contact-grid">
            <LayeredGlassAsset
              asset="contact_card"
              className="contact-card-glass"
              contentClassName="contact-card-content"
              data-reveal="fade-right"
              role="article"
            >
              <Briefcase />
              <div>
                <span>Hiring and roles</span>
                <h3>
                  Looking for a developer who can build, learn, and contribute?
                </h3>
                <p>
                  I&apos;m open to full-time opportunities across gameplay,
                  tools, and engine programming.
                </p>
              </div>
              {profile.email ? (
                <a className="contact-action" href={contactHref("role")}>
                  Let&apos;s work together <ArrowRight aria-hidden="true" />
                </a>
              ) : null}
            </LayeredGlassAsset>
            <LayeredGlassAsset
              asset="contact_card"
              className="contact-card-glass"
              contentClassName="contact-card-content"
              data-reveal="fade-left"
              role="article"
            >
              <Workflow />
              <div>
                <span>Projects and collaboration</span>
                <h3>Have a project, idea, or tool you want to build?</h3>
                <p>
                  I&apos;m open to selected collaborations and client projects
                  with a clear, useful scope.
                </p>
              </div>
              {profile.email ? (
                <a className="contact-action" href={contactHref("project")}>
                  Start a conversation <ArrowRight aria-hidden="true" />
                </a>
              ) : null}
            </LayeredGlassAsset>
          </div>
          <div className="contact-meta" data-reveal>
            {profile.contactMethods.map((method) => (
              <span key={method.label}>
                <small>{method.label}</small>
                {method.href ? (
                  <a href={method.href}>{method.value}</a>
                ) : (
                  method.value
                )}
              </span>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <LayeredGlassAsset
          asset="footer_bar"
          className="footer-glass"
          contentClassName="footer-content"
        >
          <span className="wordmark">{profile.name}</span>
          <small>{profile.role} / Bengaluru, India</small>
          <div>
            {profile.socialLinks
              .filter((link) => link.href)
              .map((link) => {
                const Icon =
                  link.label === "GitHub"
                    ? Code2
                    : link.label === "LinkedIn"
                      ? Briefcase
                      : Mail;
                return (
                  <a href={link.href!} key={link.label} aria-label={link.label}>
                    <Icon />
                  </a>
                );
              })}
          </div>
        </LayeredGlassAsset>
      </footer>
      <DetailDialog
        activeDetail={activeDetail}
        onClose={closeDetail}
        onAfterClose={restoreDetailFocus}
      />
      <QuickLook
        state={quickLook}
        onClose={closeQuickLook}
        onDesktopPointerEnter={clearQuickLookCloseTimer}
        onDesktopPointerLeave={scheduleDesktopQuickLookClose}
      />
    </div>
  );
}

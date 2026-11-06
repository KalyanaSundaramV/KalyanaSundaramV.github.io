import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUpRight, CircleDot, Gamepad2, Layers3 } from "lucide-react";

type NavEntry = { label: string; href: string };
type MenuDetail = { eyebrow: string; title: string; summary: string; links: { title: string; href: string }[] };

const descriptions: Record<string, MenuDetail> = {
  Projects: {
    eyebrow: "01 / SELECTED WORK",
    title: "WORK THAT SHIPS",
    summary: "Game prototypes, shipped projects, and practical products.",
    links: [
      { title: "Ludo Demolition", href: "#projects" },
      { title: "King Cube / Ludo Hero", href: "#projects" },
      { title: "All eight projects", href: "#projects" },
    ],
  },
  About: {
    eyebrow: "02 / ABOUT",
    title: "SYSTEMS BUILDER",
    summary: "Game and tools engineer based in Bengaluru, India.",
    links: [
      { title: "Background and approach", href: "#about" },
      { title: "Destruction pipeline", href: "#about" },
      { title: "Technical capabilities", href: "#about" },
    ],
  },
  Tools: {
    eyebrow: "04 / BUILDER'S TOOLKIT",
    title: "TOOLS + SYSTEMS",
    summary: "Unity pipelines, editor utilities, and native products.",
    links: [
      { title: "Standalone tools", href: "#tools" },
      { title: "Unity editor tooling", href: "#tools" },
      { title: "Game systems", href: "#tools" },
    ],
  },
  Experience: {
    eyebrow: "05 / EXPERIENCE",
    title: "CAREER TIMELINE",
    summary: "Gameplay delivery, rapid prototyping, and technical leadership.",
    links: [
      { title: "Professional experience", href: "#experience" },
      { title: "Skills and education", href: "#resume" },
      { title: "Résumé", href: "#resume" },
    ],
  },
  Learning: {
    eyebrow: "06 / DEVELOPMENT NOTES",
    title: "IN PROGRESS",
    summary: "Inspect the ideas, implementation notes, and next milestones.",
    links: [
      { title: "Learning entries", href: "#learning" },
      { title: "Development timeline", href: "#learning" },
      { title: "Explore projects", href: "#projects" },
    ],
  },
  Resume: {
    eyebrow: "07 / CAREER",
    title: "THE SHORT VERSION",
    summary: "Skills, experience, education, and downloadable résumé.",
    links: [
      { title: "Get résumé", href: "#resume" },
      { title: "Experience", href: "#experience" },
      { title: "Contact", href: "#contact" },
    ],
  },
  Contact: {
    eyebrow: "08 / GET IN TOUCH",
    title: "LET'S BUILD",
    summary: "Full-time roles and focused collaborations.",
    links: [
      { title: "Work together", href: "#contact" },
      { title: "Professional background", href: "#experience" },
      { title: "Selected work", href: "#projects" },
    ],
  },
};

export function LiquidNav({
  items,
  activeSection,
}: {
  items: NavEntry[];
  activeSection: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [geometry, setGeometry] = useState({ left: 0, lineX: 200, lineWidth: 56 });
  const [hasPointer, setHasPointer] = useState(false);

  const cancelClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const close = () => {
    cancelClose();
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    setOpen(false);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 170);
  };

  const openFor = (index: number, element: HTMLElement) => {
    if (!window.matchMedia("(min-width: 961px)").matches) return;
    cancelClose();
    const navRect = rootRef.current?.getBoundingClientRect();
    if (!navRect) return;
    const rect = element.getBoundingClientRect();
    const panelWidth = Math.min(580, window.innerWidth - 40);
    const navSpace = Math.max(0, navRect.width - panelWidth);
    const lineX = rect.left - navRect.left;
    const panelLeft = Math.max(0, Math.min(navSpace, lineX + rect.width / 2 - panelWidth / 2));
    setGeometry({ left: panelLeft, lineX: Math.max(0, lineX - panelLeft), lineWidth: rect.width });
    setActiveIndex(index);
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => setOpen(true));
  };

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!rootRef.current?.contains(event.relatedTarget)) scheduleClose();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      close();
      (event.target as HTMLElement).blur();
    }
  };

  const current = activeIndex === null ? null : descriptions[items[activeIndex]?.label];
  const style = {
    left: `${geometry.left}px`,
    "--merge-line-x": `${geometry.lineX}px`,
    "--merge-line-w": `${geometry.lineWidth}px`,
  } as CSSProperties;

  return (
    <nav
      ref={rootRef}
      className="desktop-nav merged-liquid-nav"
      aria-label="Primary navigation"
      onMouseEnter={() => setHasPointer(true)}
      onMouseLeave={() => {
        setHasPointer(false);
        scheduleClose();
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        const active = activeSection === item.href.slice(1);
        return (
          <a
            key={`${item.label}-${item.href}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-haspopup="true"
            aria-controls="merged-nav-expansion"
            aria-expanded={activeIndex === index && isOpen}
            data-active={active}
            data-expanded={activeIndex === index && isOpen}
            onMouseEnter={(event) => openFor(index, event.currentTarget)}
            onFocus={(event) => openFor(index, event.currentTarget)}
            onClick={close}
          >
            {item.label}
          </a>
        );
      })}
      <div
        id="merged-nav-expansion"
        className="merged-nav-expansion"
        data-open={Boolean(current) && isOpen}
        data-pointer={hasPointer}
        style={style}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="merged-nav-glass-surface" aria-hidden="true" />
        <div className="merged-nav-drop-body">
          <div className="merged-nav-illustration" aria-hidden="true">
            <svg viewBox="0 0 260 170" role="presentation" focusable="false">
              <defs>
                <linearGradient id="merged-link-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="var(--glass-accent)" stopOpacity=".95" />
                  <stop offset="1" stopColor="var(--glass-violet)" stopOpacity=".6" />
                </linearGradient>
              </defs>
              <path className="merged-orbit" d="M30 90 Q60 10 137 46 T223 87 M48 138 Q125 95 204 132" />
              <path className="merged-orbit orbit-alt" d="M81 32 Q126 136 211 52 M46 85 Q146 165 219 92" />
              <g className="node-node a"><circle cx="46" cy="86" r="21"/><CircleDot x="35" y="75" width="22" height="22"/></g>
              <g className="node-node b"><circle cx="129" cy="43" r="24"/><Layers3 x="116" y="30" width="26" height="26"/></g>
              <g className="node-node c"><circle cx="212" cy="91" r="29"/><Gamepad2 x="196" y="75" width="32" height="32"/></g>
              <g className="node-node d"><circle cx="113" cy="136" r="17"/></g>
            </svg>
            <span className="merged-diagram-label">INTERACTIVE / SYSTEMS</span>
          </div>
          <div className="merged-nav-copy" key={current?.title ?? "none"}>
            <span className="merged-nav-eyebrow">{current?.eyebrow}</span>
            <strong className="merged-nav-heading">{current?.title}</strong>
            <p>{current?.summary}</p>
            <div className="merged-nav-links">
              {current?.links.map((link) => (
                <a key={`${current.title}-${link.title}`} href={link.href} onClick={close}>
                  <span>{link.title}</span><ArrowUpRight size={15} aria-hidden="true"/>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

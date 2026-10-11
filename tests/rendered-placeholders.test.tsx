import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { DetailDialog } from "@/components/detail/DetailDialog";
import { QuickLook } from "@/components/detail/QuickLook";
import { learningEntries } from "@/content/learning";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { ludoTimeline } from "@/content/resume";
import { gameSystems, toolGroups, tools } from "@/content/tools";
import {
  learningDetail,
  suiteDetail,
  systemDetail,
  timelineLearningDetail,
  utilityDetail,
  type ActiveDetail,
} from "@/lib/detail";

// GSAP's ticker re-requests a frame from inside its frame callback; the shared
// synchronous requestAnimationFrame stub would recurse forever, so the full-page
// render in this file uses an asynchronous frame instead.
vi.hoisted(() => {
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => window.clearTimeout(id),
  });
});

vi.mock("@/components/DestructionLab", () => ({
  DestructionLab: () => <div data-testid="destruction-lab-stub" />,
}));

const forbidden = [
  /\[Add/i,
  /placeholder/i,
  /will be added/i,
  /will replace/i,
  /\bTODO\b/,
  /\bTBD\b/,
];

function expectNoPlaceholderText(label: string) {
  const text = document.body.textContent ?? "";
  for (const pattern of forbidden) {
    expect(text, `${label} contains ${pattern}`).not.toMatch(pattern);
  }
}

function everyDetail(): Array<{ label: string; detail: ActiveDetail }> {
  return [
    ...projects.map((item) => ({
      label: `project ${item.slug}`,
      detail: { kind: "project", item } as ActiveDetail,
    })),
    ...tools.map((tool) => ({
      label: `suite ${tool.slug}`,
      detail: { kind: "tool", item: suiteDetail(tool) } as ActiveDetail,
    })),
    ...toolGroups.flatMap((group) =>
      group.tools.map((tool) => ({
        label: `utility ${tool.slug}`,
        detail: {
          kind: "tool",
          item: utilityDetail(tool, group),
        } as ActiveDetail,
      })),
    ),
    ...gameSystems.map((system) => ({
      label: `system ${system.slug}`,
      detail: { kind: "tool", item: systemDetail(system) } as ActiveDetail,
    })),
    ...learningEntries.map((entry) => ({
      label: `learning ${entry.slug}`,
      detail: { kind: "learning", item: learningDetail(entry) } as ActiveDetail,
    })),
    ...ludoTimeline.map((item, index) => ({
      label: `development note ${index + 1}`,
      detail: {
        kind: "learning",
        item: timelineLearningDetail(item, index),
      } as ActiveDetail,
    })),
  ];
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("public pages show no placeholder text", () => {
  it("covers every detail surface", () => {
    expect(everyDetail().length).toBeGreaterThan(projects.length);
  });

  it.each(everyDetail())("$label detail dialog", ({ label, detail }) => {
    render(<DetailDialog activeDetail={detail} onClose={() => undefined} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expectNoPlaceholderText(`${label} dialog`);
  });

  it.each(everyDetail())("$label quick look", ({ label, detail }) => {
    const anchor = document.createElement("button");
    document.body.append(anchor);
    for (const mode of ["desktop", "mobile"] as const) {
      const { unmount } = render(
        <QuickLook
          state={{ detail, anchor, mode }}
          onClose={() => undefined}
        />,
      );
      expectNoPlaceholderText(`${label} ${mode} quick look`);
      unmount();
    }
    anchor.remove();
  });

  it("returns mobile navigation focus and keeps the closed menu inert", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    render(<App />);
    const menu = document.querySelector(".mobile-menu")!;
    const opener = screen.getByRole("button", { name: "Open navigation" });
    expect(menu).toHaveAttribute("inert");
    fireEvent.click(opener);
    expect(menu).not.toHaveAttribute("inert");
    const close = screen.getByRole("button", { name: "Close navigation" });
    close.focus();
    fireEvent.click(close);
    expect(opener).toHaveFocus();
    expect(menu).toHaveAttribute("inert");
    fireEvent.click(opener);
    const heroPlay = screen.getAllByRole("button", {
      name: "Play interactive demo",
    })[0];
    heroPlay.focus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(heroPlay).toHaveFocus();
    expect(menu).toHaveAttribute("inert");
  });
  it("renders the full page without placeholder text", () => {
    render(<App />);
    // The 3D lab is lazy: the page shows its poster until a visitor asks for it.
    expect(document.querySelector(".demo-poster")).not.toBeNull();
    expect(screen.queryByTestId("destruction-lab-stub")).toBeNull();
    expectNoPlaceholderText("home page");
  });

  it("offers the resume PDF from the hero without the demo", () => {
    // The intro animation starts hero links hidden; reduced motion renders them
    // immediately, which is also the path an assistive-technology user gets.
    const matchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        ...matchMedia(query),
        matches: query.includes("prefers-reduced-motion"),
      }),
    });
    try {
      render(<App />);
      expect(
        screen.getByRole("link", { name: "Resume (PDF)" }),
      ).toHaveAttribute("href", profile.resumePdfHref);
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: matchMedia,
      });
    }
  });
});

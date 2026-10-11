import { StrictMode, useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_PLAY_REQUEST_EVENT,
  DESTRUCTION_USE_TOOL_EVENT,
} from "@/lib/events";

type LabProps = {
  onUnavailable?: () => void;
  onFirstFrame?: () => void;
  onControlsReady?: () => void;
};
let autoFrame: boolean;
let lastFrame: (() => void) | undefined;
let reduced: boolean;
let motionChanged: (() => void) | undefined;
const observers: {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];
const mediaPlay = vi.fn(() => Promise.resolve());
const mediaPause = vi.fn();
const mediaLoad = vi.fn();
let resolveLab: (value: { DestructionLab: typeof Lab }) => void;
let rejectLab: (error: Error) => void;
let failOnMount: boolean;
const strikes = vi.fn();
const load = vi.fn();

function Lab({ onUnavailable, onFirstFrame, onControlsReady }: LabProps) {
  lastFrame = onFirstFrame;
  useEffect(() => {
    window.addEventListener(DESTRUCTION_USE_TOOL_EVENT, strikes);
    if (failOnMount) onUnavailable?.();
    else if (autoFrame)
      queueMicrotask(() => {
        onControlsReady?.();
        onFirstFrame?.();
      });
    return () =>
      window.removeEventListener(DESTRUCTION_USE_TOOL_EVENT, strikes);
  }, [onUnavailable, onFirstFrame, onControlsReady]);
  return (
    <>
      <button onClick={onUnavailable}>Simulate WebGL failure</button>
      <button onClick={onFirstFrame}>Render first frame</button>
      <button onClick={onControlsReady}>Enable camera controls</button>
    </>
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  failOnMount = false;
  autoFrame = true;
  reduced = false;
  motionChanged = undefined;
  observers.length = 0;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        get matches() {
          return reduced && query.includes("reduced-motion");
        },
        media: query,
        addEventListener: (_: string, callback: () => void) => {
          if (query.includes("reduced-motion")) motionChanged = callback;
        },
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback;
      disconnect = vi.fn();
      observe = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this);
      }
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
    window.setTimeout(() => callback(0), 0),
  );
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) =>
    window.clearTimeout(id),
  );
  mediaPlay.mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(mediaPlay);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(mediaPause);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(mediaLoad);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as WebGLRenderingContext,
  );
  const module = new Promise<{ DestructionLab: typeof Lab }>(
    (resolve, reject) => {
      resolveLab = resolve;
      rejectLab = reject;
    },
  );
  vi.doMock("@/components/DestructionLab", () => {
    load();
    return module;
  });
});

afterEach(() => {
  cleanup();
  vi.doUnmock("@/components/DestructionLab");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(strict = false, onLive = vi.fn(), onStop = vi.fn()) {
  const { DemoStage } = await import("@/components/DemoStage");
  return {
    ...render(
      strict ? (
        <StrictMode>
          <DemoStage onLive={onLive} onStop={onStop} />
        </StrictMode>
      ) : (
        <DemoStage onLive={onLive} onStop={onStop} />
      ),
    ),
    onLive,
    onStop,
  };
}

async function finishLoading() {
  await act(async () => {
    resolveLab({ DestructionLab: Lab });
  });
}

function requestStrike() {
  fireEvent(window, new Event(DEMO_PLAY_REQUEST_EVENT));
}

function expectUnavailable() {
  expect(document.querySelector("#interactive-demo")).toHaveAttribute(
    "data-phase",
    "unavailable",
  );
  expect(screen.getByText(/cannot run the WebGL scene/)).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Watch the demo video" }),
  ).not.toBeInTheDocument();
}

describe("DemoStage", () => {
  it("shows its poster without importing the 3D module", async () => {
    await mount();
    expect(
      screen.getByRole("button", { name: "Play interactive demo" }),
    ).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("loads on play and preserves focus when the poster disappears", async () => {
    const { onLive } = await mount();
    const play = screen.getByRole("button", { name: "Play interactive demo" });
    play.focus();
    fireEvent.click(play);
    const loading = screen.getByRole("button", { name: /Loading demo/ });
    expect(loading).toHaveAttribute("aria-disabled", "true");
    expect(loading).not.toBeDisabled();
    expect(loading).toHaveFocus();
    await finishLoading();
    await waitFor(() =>
      expect(document.querySelector("#interactive-demo")).toHaveAttribute(
        "data-phase",
        "live",
      ),
    );
    expect(document.querySelector("#interactive-demo")).toHaveFocus();
    expect(load).toHaveBeenCalledTimes(1);
    expect(onLive).toHaveBeenCalledTimes(1);
    expect(strikes).not.toHaveBeenCalled();
  });

  it("queues one strike before load, even in StrictMode, then accepts live requests", async () => {
    await mount(true);
    requestStrike();
    requestStrike();
    expect(strikes).not.toHaveBeenCalled();
    await finishLoading();
    await waitFor(() => expect(strikes).toHaveBeenCalledTimes(1));
    requestStrike();
    expect(strikes).toHaveBeenCalledTimes(2);
  });

  it("shows the fallback without downloading when WebGL is unavailable", async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    await mount();
    requestStrike();
    expectUnavailable();
    expect(load).not.toHaveBeenCalled();
    expect(strikes).not.toHaveBeenCalled();
  });

  it("shows the fallback when the live lab reports failure", async () => {
    await mount();
    requestStrike();
    await finishLoading();
    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate WebGL failure" }),
    );
    expectUnavailable();
    requestStrike();
    expect(strikes).toHaveBeenCalledTimes(1);
  });

  it("keeps an initialization failure unavailable instead of marking it live", async () => {
    failOnMount = true;
    const { onLive } = await mount();
    requestStrike();
    await finishLoading();
    await waitFor(expectUnavailable);
    expect(onLive).not.toHaveBeenCalled();
    expect(strikes).not.toHaveBeenCalled();
  });

  it("shows the fallback when the lazy chunk rejects", async () => {
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { onLive } = await mount();
    requestStrike();
    await act(async () => {
      rejectLab(new Error("Failed to fetch demo chunk"));
    });
    await waitFor(expectUnavailable);
    expect(errors).toHaveBeenCalled();
    expect(onLive).not.toHaveBeenCalled();
    expect(strikes).not.toHaveBeenCalled();
  });

  it("removes its request listener on unmount", async () => {
    const { unmount } = await mount();
    unmount();
    requestStrike();
    expect(load).not.toHaveBeenCalled();
  });
});

function visibility(ratio: number) {
  act(() =>
    observers
      .at(-1)!
      .callback(
        [
          { isIntersecting: ratio > 0, intersectionRatio: ratio },
        ] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      ),
  );
}

describe("hero preview and demo exit", () => {
  it("renders decorative poster/media and starts only at 35% visibility", async () => {
    await mount();
    const video = document.querySelector("video")!;
    expect(video).toHaveAttribute(
      "poster",
      "/media/homestead-preview-poster.webp",
    );
    expect(video).toHaveAttribute("aria-hidden", "true");
    expect(video).toHaveAttribute("tabindex", "-1");
    expect(
      [...video.querySelectorAll("source")].map((source) => source.type),
    ).toEqual(["video/mp4", "video/webm"]);
    visibility(0.34);
    expect(mediaPlay).not.toHaveBeenCalled();
    visibility(0.35);
    await waitFor(() => expect(mediaPlay).toHaveBeenCalledTimes(1));
    visibility(0);
    expect(mediaPause).toHaveBeenCalled();
  });
  it("pauses when hidden and when reduced motion changes, then resumes", async () => {
    await mount();
    visibility(0.8);
    await waitFor(() => expect(mediaPlay).toHaveBeenCalledTimes(1));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(mediaPause).toHaveBeenCalled();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(mediaPlay).toHaveBeenCalledTimes(2));
    reduced = true;
    act(() => motionChanged?.());
    expect(document.querySelector(".hero-preview-layer")).toHaveAttribute(
      "data-playing",
      "false",
    );
  });
  it("reduced motion prevents autoplay", async () => {
    reduced = true;
    await mount();
    visibility(1);
    expect(mediaPlay).not.toHaveBeenCalled();
    expect(document.querySelector(".hero-preview-layer")).toHaveAttribute(
      "data-playing",
      "false",
    );
  });
  it("keeps the poster after blocked autoplay without repeatedly retrying", async () => {
    mediaPlay.mockRejectedValue(new Error("Autoplay blocked"));
    await mount();
    visibility(1);
    await waitFor(() => expect(mediaPlay).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(document.querySelector(".hero-preview-layer")).toHaveAttribute(
        "data-playing",
        "false",
      ),
    );
    expect(document.querySelector(".hero-preview-layer")).toHaveAttribute(
      "data-preview-error",
      "Error",
    );
    visibility(0);
    visibility(1);
    expect(mediaPlay).toHaveBeenCalledTimes(1);
    expect(document.querySelector("#interactive-demo")).toHaveAttribute(
      "data-phase",
      "poster",
    );
  });
  it("ignores an AbortError from playback cancelled by leaving the hero", async () => {
    let rejectPlay!: (error: Error) => void;
    mediaPlay.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectPlay = reject;
        }),
    );
    await mount();
    visibility(1);
    await waitFor(() => expect(mediaPlay).toHaveBeenCalledTimes(1));
    visibility(0);
    await act(async () =>
      rejectPlay(new DOMException("Playback interrupted", "AbortError")),
    );
    expect(document.querySelector(".hero-preview-layer")).not.toHaveAttribute(
      "data-preview-error",
    );
    visibility(1);
    await waitFor(() =>
      expect(document.querySelector(".hero-preview-layer")).toHaveAttribute(
        "data-preview-state",
        "playing",
      ),
    );
  });
  it("media errors show the poster without disabling Play", async () => {
    await mount();
    fireEvent.error(document.querySelector("video")!);
    visibility(1);
    expect(mediaPlay).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Play interactive demo" }),
    ).toBeEnabled();
  });
  it("waits for a rendered frame, crossfades, releases sources and disconnects playback observation", async () => {
    autoFrame = false;
    await mount();
    requestStrike();
    await finishLoading();
    expect(document.querySelector("#interactive-demo")).toHaveAttribute(
      "data-phase",
      "loading",
    );
    expect(document.querySelectorAll("video source")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Render first frame" }));
    await waitFor(() =>
      expect(document.querySelector("#interactive-demo")).toHaveAttribute(
        "data-frame-visible",
        "true",
      ),
    );
    expect(document.querySelectorAll("video source")).toHaveLength(2);
    await waitFor(() =>
      expect(document.querySelectorAll("video source")).toHaveLength(0),
    );
    expect(mediaLoad).toHaveBeenCalled();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(screen.getByText("Preparing interactive scene")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Enable camera controls" }),
    );
    expect(
      screen.getByText("Scroll to zoom · Drag to orbit"),
    ).toBeInTheDocument();
  });
  it("Stop during loading ignores the late module and clears its queued strike", async () => {
    const { onLive, onStop } = await mount();
    requestStrike();
    const stop = screen.getByRole("button", { name: "Stop demo" });
    stop.focus();
    fireEvent.click(stop);
    await finishLoading();
    expect(document.querySelector("#interactive-demo")).toHaveAttribute(
      "data-phase",
      "poster",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Play interactive demo" }),
      ).toHaveFocus(),
    );
    expect(strikes).not.toHaveBeenCalled();
    expect(onLive).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
  });
  it("Stop live restores media and restart accepts only its new strike", async () => {
    const { onStop } = await mount();
    requestStrike();
    await finishLoading();
    await waitFor(() => expect(strikes).toHaveBeenCalledTimes(1));
    const stale = lastFrame;
    fireEvent.click(screen.getByRole("button", { name: "Stop demo" }));
    act(() => stale?.());
    expect(document.querySelectorAll("video source")).toHaveLength(2);
    expect(document.querySelector("#interactive-demo")).toHaveAttribute(
      "data-phase",
      "poster",
    );
    requestStrike();
    await waitFor(() => expect(strikes).toHaveBeenCalledTimes(2));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
  it("Continue down stops, focuses Projects and uses reduced-motion scrolling", async () => {
    reduced = true;
    const section = document.createElement("section");
    section.id = "projects";
    section.innerHTML = "<h2>Projects</h2>";
    section.scrollIntoView = vi.fn();
    document.body.append(section);
    await mount();
    requestStrike();
    await finishLoading();
    await waitFor(() =>
      expect(document.querySelector("#interactive-demo")).toHaveAttribute(
        "data-phase",
        "live",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue down" }));
    await waitFor(() => expect(section.querySelector("h2")).toHaveFocus());
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
    expect(window.location.hash).toBe("#projects");
    section.remove();
  });
});

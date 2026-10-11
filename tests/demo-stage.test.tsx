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

type LabProps = { onUnavailable?: () => void };
let resolveLab: (value: { DestructionLab: typeof Lab }) => void;
let rejectLab: (error: Error) => void;
let failOnMount: boolean;
const strikes = vi.fn();
const load = vi.fn();

function Lab({ onUnavailable }: LabProps) {
  useEffect(() => {
    window.addEventListener(DESTRUCTION_USE_TOOL_EVENT, strikes);
    if (failOnMount) onUnavailable?.();
    return () =>
      window.removeEventListener(DESTRUCTION_USE_TOOL_EVENT, strikes);
  }, [onUnavailable]);
  return <button onClick={onUnavailable}>Simulate WebGL failure</button>;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  failOnMount = false;
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
});

async function mount(strict = false, onLive = vi.fn()) {
  const { DemoStage } = await import("@/components/DemoStage");
  return {
    ...render(
      strict ? (
        <StrictMode>
          <DemoStage onLive={onLive} />
        </StrictMode>
      ) : (
        <DemoStage onLive={onLive} />
      ),
    ),
    onLive,
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
    expect(screen.getByRole("button", { name: /Loading demo/ })).toBeDisabled();
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

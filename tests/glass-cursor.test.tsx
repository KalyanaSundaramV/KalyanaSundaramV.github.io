import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidGlass } from "@/components/glass/LiquidGlass";
import { PageCursor } from "@/components/PageCursor";

type Observer = {
  callback: IntersectionObserverCallback;
  target?: Element;
  disconnect: ReturnType<typeof vi.fn>;
};
const observers: Observer[] = [];
let reduced = false;
let fine = true;
const motionListeners = new Set<() => void>();
const destroy = vi.fn();
const setTint = vi.fn();
const initialize = vi.fn(() => {
  const target = observers.at(-1)?.target;
  const canvas = document.createElement("canvas");
  canvas.dataset.liquidIgnore = "true";
  target?.append(canvas);
  return {
    destroy: () => {
      destroy();
      canvas.remove();
    },
    setTint,
  };
});
const importer = vi.fn(async () => ({ default: initialize }));
function show(visible = true) {
  act(() =>
    observers
      .at(-1)!
      .callback(
        [
          { isIntersecting: visible, intersectionRatio: visible ? 1 : 0 },
        ] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  fine = true;
  observers.length = 0;
  motionListeners.clear();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        get matches() {
          return query.includes("reduced-motion") ? reduced : fine;
        },
        media: query,
        addEventListener: (_: string, callback: () => void) => {
          if (query.includes("reduced-motion")) motionListeners.add(callback);
        },
        removeEventListener: (_: string, callback: () => void) => {
          motionListeners.delete(callback);
        },
      }) as unknown as MediaQueryList,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as WebGLRenderingContext,
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback;
      target?: Element;
      disconnect = vi.fn();
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this);
      }
      observe(target: Element) {
        this.target = target;
      }
    },
  );
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerType: string;
      constructor(type: string, options: PointerEventInit) {
        super(type, options);
        this.pointerType = options.pointerType ?? "mouse";
      }
    },
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
    window.setTimeout(() => callback(0), 0),
  );
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) =>
    window.clearTimeout(id),
  );
  document.body.innerHTML =
    '<div class="nav-glass" style="position:fixed"><div class="nav-glass-content"><button>Nav</button></div></div><div class="mobile-menu-head" style="position:sticky"><div class="mobile-menu-head-content">Menu</div></div><div class="case-study-head" style="position:sticky"><div class="case-study-head-content">Detail</div></div>';
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("liquid chrome", () => {
  it("initializes only visible chrome and excludes native content from capture", async () => {
    render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={importer}
      />,
    );
    expect(importer).not.toHaveBeenCalled();
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    expect(initialize.mock.calls[0][0]).toMatchObject({
      target: ".nav-glass",
      content: false,
      engine: "webgl2",
      helper: false,
      draggable: false,
    });
    expect(document.querySelector(".nav-glass-content")).toHaveAttribute(
      "data-liquid-ignore",
      "true",
    );
    show(false);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
  it("destroys the old lens before selecting menu or detail priority", async () => {
    const props = { theme: "dark" as const, importer };
    const view = render(
      <LiquidGlass {...props} menuOpen={false} detailOpen={false} />,
    );
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    view.rerender(<LiquidGlass {...props} menuOpen detailOpen={false} />);
    expect(destroy).toHaveBeenCalledTimes(1);
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
    expect(initialize.mock.calls[1][0]).toMatchObject({
      target: ".mobile-menu-head",
    });
    view.rerender(<LiquidGlass {...props} menuOpen detailOpen />);
    expect(destroy).toHaveBeenCalledTimes(2);
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(3));
    expect(initialize.mock.calls[2][0]).toMatchObject({
      target: ".case-study-head",
    });
    view.unmount();
    expect(destroy).toHaveBeenCalledTimes(3);
  });
  it("updates GPU tint and releases hidden/reduced-motion chrome", async () => {
    const view = render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={importer}
      />,
    );
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    view.rerender(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="dark"
        importer={importer}
      />,
    );
    expect(setTint).toHaveBeenLastCalledWith("rgba(37, 44, 76, 0.34)");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(destroy).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
    reduced = true;
    act(() => motionListeners.forEach((listener) => listener()));
    expect(destroy).toHaveBeenCalledTimes(2);
  });
  it("context loss restores CSS and does not immediately recreate the lost lens", async () => {
    render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={importer}
      />,
    );
    show();
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    fireEvent(document.querySelector("canvas")!, new Event("webglcontextlost"));
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".nav-glass")).not.toHaveAttribute(
      "data-liquid-active",
    );
    show(false);
    show();
    expect(initialize).toHaveBeenCalledTimes(1);
  });
  it("ignores stale imports after unmount and silently retains CSS after failures", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof importer>>) => void;
    const delayed = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<typeof importer>>>((done) => {
          resolve = done;
        }),
    );
    const view = render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={delayed}
      />,
    );
    show();
    view.unmount();
    await act(async () => resolve({ default: initialize }));
    expect(initialize).not.toHaveBeenCalled();
    const failed = vi.fn(async () => {
      throw new Error("chunk failure");
    });
    render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={failed}
      />,
    );
    show();
    await waitFor(() => expect(failed).toHaveBeenCalledTimes(1));
    expect(document.querySelector(".nav-glass")).not.toHaveAttribute(
      "data-liquid-active",
    );
  });
  it("skips unsupported GPU rather than invoking a noisy CSS-only library fallback", () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    render(
      <LiquidGlass
        menuOpen={false}
        detailOpen={false}
        theme="light"
        importer={importer}
      />,
    );
    expect(importer).not.toHaveBeenCalled();
    expect(observers).toHaveLength(0);
  });
});

describe("decorative cursor", () => {
  it("shows page and ready-demo modes but hides over controls, keyboard and leave", async () => {
    const { container } = render(<PageCursor />);
    const cursor = container.querySelector(".page-cursor")!;
    const page = document.createElement("div");
    document.body.append(page);
    fireEvent.pointerMove(page, {
      pointerType: "mouse",
      clientX: 70,
      clientY: 80,
    });
    expect(cursor).toHaveAttribute("data-mode", "page");
    expect(cursor).toHaveAttribute("data-visible", "true");
    await waitFor(() => expect(cursor.getAttribute("style")).toContain("70px"));
    const stage = document.createElement("div");
    stage.className = "demo-stage";
    stage.dataset.phase = "live";
    const canvas = document.createElement("canvas");
    stage.append(canvas);
    document.body.append(stage);
    fireEvent.pointerMove(canvas, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    canvas.dataset.demoControlsReady = "true";
    fireEvent.pointerMove(canvas, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-mode", "demo");
    fireEvent.pointerMove(document.querySelector("button")!, {
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-visible", "false");
    fireEvent.pointerMove(page, { pointerType: "mouse" });
    fireEvent.keyDown(window, { key: "Tab" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    fireEvent.pointerMove(page, { pointerType: "mouse" });
    fireEvent(document, new Event("pointerleave"));
    expect(cursor).toHaveAttribute("data-visible", "false");
  });
  it("disables touch, reduced motion and stopped canvases, with listener cleanup", () => {
    const { container, unmount } = render(<PageCursor />);
    const cursor = container.querySelector(".page-cursor")!;
    const page = document.createElement("div");
    document.body.append(page);
    fireEvent.pointerMove(page, { pointerType: "touch" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    reduced = true;
    fireEvent.pointerMove(page, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    reduced = false;
    fine = false;
    fireEvent.pointerMove(page, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    fine = true;
    const stage = document.createElement("div");
    stage.className = "demo-stage";
    stage.dataset.phase = "poster";
    const canvas = document.createElement("canvas");
    canvas.dataset.demoControlsReady = "true";
    stage.append(canvas);
    document.body.append(stage);
    fireEvent.pointerMove(canvas, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-visible", "false");
    const remove = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
  });
});

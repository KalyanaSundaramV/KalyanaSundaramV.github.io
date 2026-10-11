import { useRef, useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailDialog } from "@/components/detail/DetailDialog";
import {
  QuickLook,
  QuickLookButton,
  type QuickLookState,
} from "@/components/detail/QuickLook";
import { tools } from "@/content/tools";
import { suiteDetail, type ActiveDetail } from "@/lib/detail";

const toolDetail: ActiveDetail = {
  kind: "tool",
  item: suiteDetail(tools[0]),
};

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 768,
  });
});

describe("DetailDialog", () => {
  it("labels the dialog, focuses close, and locks body scrolling", async () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <DetailDialog activeDetail={toolDetail} onClose={onClose} />,
    );

    expect(screen.getByRole("dialog")).toHaveAccessibleName(tools[0].title);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close details" }),
      ).toHaveFocus(),
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes from the true backdrop but not from inside the dialog", () => {
    const onClose = vi.fn();
    render(<DetailDialog activeDetail={toolDetail} onClose={onClose} />);

    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = document.querySelector(".case-study-modal");
    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and keeps Tab focus inside", async () => {
    const onClose = vi.fn();
    render(<DetailDialog activeDetail={toolDetail} onClose={onClose} />);
    const close = screen.getByRole("button", { name: "Close details" });
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.keyDown(close, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can restore focus through the opening trigger contract", async () => {
    function Harness() {
      const trigger = useRef<HTMLButtonElement>(null);
      const [active, setActive] = useState<ActiveDetail | null>(null);
      const close = () => {
        setActive(null);
        window.requestAnimationFrame(() => trigger.current?.focus());
      };
      return (
        <>
          <button
            ref={trigger}
            type="button"
            onClick={() => setActive(toolDetail)}
          >
            Open detail
          </button>
          <DetailDialog activeDetail={active} onClose={close} />
        </>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open detail" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(trigger).toHaveFocus();
  });
});

describe("QuickLook", () => {
  function createAnchor() {
    const anchor = document.createElement("button");
    anchor.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 100,
        top: 100,
        right: 260,
        bottom: 160,
        left: 100,
        width: 160,
        height: 60,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.append(anchor);
    return anchor;
  }

  it("shows equivalent public-safe detail in desktop tooltip mode", () => {
    const anchor = createAnchor();
    const state: QuickLookState = {
      detail: toolDetail,
      anchor,
      mode: "desktop",
    };
    render(<QuickLook state={state} onClose={vi.fn()} />);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(tools[0].title);
    expect(tooltip).toHaveTextContent("Editor suite");
    expect(tooltip).toHaveTextContent(tools[0].detail.proofPoints[0]);
    anchor.remove();
  });

  it("centers a mobile quick look and closes it on outside pointer and Escape", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });
    const anchor = createAnchor();
    const onClose = vi.fn();
    const state: QuickLookState = {
      detail: toolDetail,
      anchor,
      mode: "mobile",
    };
    render(<QuickLook state={state} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      `Quick look at ${tools[0].title}`,
    );
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveStyle({
        left: "14px",
        top: "422px",
        width: "362px",
      }),
    );
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    anchor.remove();
  });

  it("keeps the mobile Info action separate from the card click", async () => {
    const user = userEvent.setup();
    const openCard = vi.fn();
    const openQuickLook = vi.fn();
    render(
      <div role="button" tabIndex={0} onClick={openCard}>
        <QuickLookButton
          detail={toolDetail}
          expanded={false}
          onOpen={openQuickLook}
        />
      </div>,
    );

    const info = screen.getByRole("button", {
      name: `Quick look at ${tools[0].title}`,
    });
    await user.click(info);
    expect(openQuickLook).toHaveBeenCalledTimes(1);
    expect(openCard).not.toHaveBeenCalled();
    expect(info).toHaveAttribute("aria-expanded", "false");
  });
});

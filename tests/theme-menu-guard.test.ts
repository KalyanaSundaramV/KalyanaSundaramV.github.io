import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const safe = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c as keyof Record<string, string>] ?? c));

function getPaintThemeOptions() {
  const source = readFileSync(path.join(process.cwd(), "app.js"), "utf8");
  const start = source.indexOf("function paintThemeOptions(){");
  const end = source.indexOf("function applyTheme(id)");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function createThemeMenuRenderer(document: any) {
  const source = getPaintThemeOptions();
  return new Function(
    "document",
    "safe",
    "themes",
    "featuredThemeIds",
    `const $ = (sel, root=document) => root.querySelector(sel); ${source}; return paintThemeOptions;`,
  )(
    document,
    safe,
    [
      { id: "crimson", label: "DARK NIGHT & CRIMSON", bg: "#061726", accent: "#D73139" },
      { id: "ocean", label: "DEEP OCEAN & TOXIC", bg: "#041226", accent: "#78E825" },
      { id: "lava", label: "DARK VOID & LIQUID LAVA", bg: "#151419", accent: "#F56E0F" },
      { id: "cyan", label: "MIDNIGHT & CYAN", bg: "#010310", accent: "#23A9BD" },
    ],
    new Set(["lava"]),
  );
}

describe("theme menu guard", () => {
  it("does not throw when the older theme markup is missing optional nodes", () => {
    const paintThemeOptions = createThemeMenuRenderer({
      body: { dataset: { theme: "lava" } },
      querySelector: () => null,
    });

    expect(() => paintThemeOptions()).not.toThrow();
  });

  it("keeps writing the modern theme menu when those elements exist", () => {
    const themeOptions = { innerHTML: "" };
    const extraOptions = { innerHTML: "" };
    const status = { textContent: "" };
    const paintThemeOptions = createThemeMenuRenderer({
      body: { dataset: { theme: "ocean" } },
      querySelector: (selector: string) => {
        if (selector === "#theme-options") return themeOptions;
        if (selector === "#theme-options-more") return extraOptions;
        if (selector === "#theme-extra .theme-extra-status") return status;
        return null;
      },
    });

    expect(() => paintThemeOptions()).not.toThrow();
    expect(themeOptions.innerHTML).toContain("data-theme-option=\"lava\"");
    expect(extraOptions.innerHTML).toContain("data-theme-option=\"ocean\"");
    expect(status.textContent).toBe("ACTIVE: DEEP OCEAN & TOXIC");
  });
});

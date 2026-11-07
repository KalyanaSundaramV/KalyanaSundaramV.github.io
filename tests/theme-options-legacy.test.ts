import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("legacy theme menu rendering", () => {
  it("does not throw when the extra theme status nodes are missing", () => {
    document.body.innerHTML = `
      <div id="theme-menu">
        <div class="theme-options" id="theme-options"></div>
      </div>
    `;
    document.body.dataset.theme = "lava";

    const source = readFileSync(`${process.cwd()}/app.js`, "utf8");
    const start = source.indexOf("const themes = [");
    const end = source.indexOf("\n  function applyTheme", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const snippet = source.slice(start, end);

    const execute = new Function(`
      const $ = (sel, root = document) => root.querySelector(sel);
      const safe = value => String(value ?? "").replace(/[&<>\"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c]));
      ${snippet.replace(/const featuredThemeIds = new Set\(\[.*?\]\);\s*\n/, "")}
      paintThemeOptions();
    `);

    expect(() => execute()).not.toThrow();
    expect(document.querySelector("#theme-options")?.textContent ?? "").toContain(
      "DARK VOID & LIQUID LAVA",
    );
  });
});

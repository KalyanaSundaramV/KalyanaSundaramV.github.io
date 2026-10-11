import { describe, expect, it } from "vitest";
import { learningEntries } from "@/content/learning";
import { projects } from "@/content/projects";
import { gameSystems, toolGroups, tools } from "@/content/tools";
import type { PublicDetail } from "@/lib/types";

function expectCompleteDetail(detail: PublicDetail) {
  expect(detail.scope.trim().length).toBeGreaterThan(30);
  expect(detail.constraints.length).toBeGreaterThanOrEqual(2);
  expect(detail.engineeringHighlights.length).toBeGreaterThanOrEqual(2);
  expect(detail.proofPoints.length).toBeGreaterThanOrEqual(2);
  expect(detail.disclosure?.trim().length).toBeGreaterThan(30);
  for (const value of [
    detail.scope,
    ...detail.constraints,
    ...detail.engineeringHighlights,
    ...detail.proofPoints,
  ]) {
    expect(value.trim().length).toBeGreaterThan(10);
  }
}

describe("public-safe portfolio detail", () => {
  it("gives every suite, utility, system, and learning entry complete detail", () => {
    for (const tool of tools) expectCompleteDetail(tool.detail);
    for (const group of toolGroups) {
      for (const utility of group.tools) expectCompleteDetail(utility.detail);
    }
    for (const system of gameSystems) expectCompleteDetail(system.detail);
    for (const entry of learningEntries) expectCompleteDetail(entry.detail);
  });

  it("does not reuse one generic utility narrative within a discipline", () => {
    for (const group of toolGroups) {
      const scopes = group.tools.map((tool) => tool.detail.scope);
      const primaryHighlights = group.tools.map(
        (tool) => tool.detail.engineeringHighlights[0],
      );
      expect(new Set(scopes).size).toBe(scopes.length);
      expect(new Set(primaryHighlights).size).toBe(primaryHighlights.length);
    }
  });

  it("preserves confidentiality and privacy boundaries", () => {
    const ludoHero = projects.find((project) => project.slug === "ludo-hero");
    const moneyPlanner = projects.find(
      (project) => project.slug === "money-planner",
    );
    expect(ludoHero?.notice).toMatch(/Confidentiality note/);
    expect(ludoHero?.notice).toMatch(/No former-employer source code/);
    expect(moneyPlanner?.notice).toMatch(/Privacy note/);
    expect(moneyPlanner?.notice).toMatch(/local-first/);
  });

  it("removes unsupported learning cards from the public portfolio", () => {
    expect(learningEntries).toEqual([]);
  });
});

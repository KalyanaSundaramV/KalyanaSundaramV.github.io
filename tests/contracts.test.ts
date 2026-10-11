import { describe, expect, test } from "vitest";
import {
  assessContract,
  contractAvailability,
  contracts,
  dormantHazardBlast,
  hazardPhase,
  siteFeatures,
  toolBlockReason,
  type Contract,
  type ContractRun,
} from "@/lib/contracts";
import { createBuilding, scenePresets, type ToolId } from "@/lib/destruction";
import { analyzeStructuralSupport } from "@/lib/structuralSupport";

const contract = (id: string) => contracts.find((item) => item.id === id)!;
const industrialScene = scenePresets.find(
  (scene) => scene.id === "industrial",
)!;
const industrial = createBuilding(industrialScene);
const site = siteFeatures(industrialScene);
const assess = (item: Contract, state: ContractRun) =>
  assessContract(item, industrial, state, site);
const block = (item: Contract, state: ContractRun, tool: ToolId) =>
  toolBlockReason(item, industrial, state, tool, site);

// Tests describe failures by id and uses by tool and time; fill in the rest.
const run = ({
  failedOrder = [],
  uses = [],
  ...rest
}: Partial<Omit<ContractRun, "failedOrder" | "uses">> & {
  failedOrder?: string[];
  uses?: { tool: ToolId; at: number }[];
} = {}): ContractRun => ({
  elapsed: 0,
  debris: [],
  attemptId: 1,
  ...rest,
  uses: uses.map((use) => ({ ...use, point: { x: 0, z: 0 }, radius: 1 })),
  failedOrder: failedOrder.map((id, at) => ({ id, tool: "dynamite", at })),
});
const top = (part: (typeof industrial)[number]) =>
  part.position[1] + part.scale[1] / 2;
const height = Math.max(...industrial.map(top));

describe("contracts", () => {
  test("six charges: dynamite only, and never a seventh", () => {
    const sixCharges = contract("charges");
    const used = run({
      uses: Array.from({ length: 6 }, (_, at) => ({ tool: "dynamite", at })),
    });
    expect(block(sixCharges, run(), "dynamite")).toBe(null);
    expect(block(sixCharges, run(), "hammer")).toMatch(/only the dynamite/);
    expect(block(sixCharges, used, "dynamite")).toBe("No charges left");
  });

  test("budget and cooldown block a tool until they allow it", () => {
    const budget = contract("budget");
    // $8,700 of $9,000 spent: a $1,800 charge no longer fits, a $150 hammer
    // blow does.
    const spent = run({
      uses: [
        ...Array.from({ length: 4 }, (_, at) => ({
          tool: "dynamite" as const,
          at,
        })),
        { tool: "crusher", at: 5 },
      ],
    });
    expect(block(budget, spent, "dynamite")).toMatch(/budget/);
    expect(block(budget, spent, "hammer")).toBe(null);

    const rush = contract("rush");
    const swung = { uses: [{ tool: "wrecking-ball" as const, at: 10 }] };
    expect(
      block(rush, run({ ...swung, elapsed: 12 }), "wrecking-ball"),
    ).toMatch(/Cooling down/);
    expect(block(rush, run({ ...swung, elapsed: 16.5 }), "wrecking-ball")).toBe(
      null,
    );
  });

  test("height objective passes once everything above the line is down", () => {
    const above = industrial
      .filter((part) => top(part) > height * 0.4)
      .map((part) => part.id);
    expect(assess(contract("charges"), run()).result).toBe("running");
    expect(
      assess(contract("charges"), run({ failedOrder: above })).result,
    ).toBe("passed");
  });

  test("time, noise and the protected wing fail the contract", () => {
    expect(assess(contract("rush"), run({ elapsed: 91 }))).toMatchObject({
      result: "failed",
      reason: "Out of time",
    });

    const loud = run({
      uses: Array.from({ length: 4 }, (_, at) => ({ tool: "dynamite", at })),
    });
    expect(assess(contract("quiet"), loud)).toMatchObject({
      result: "failed",
      reason: "Noise limit broken",
    });

    const centre = industrial.find((part) => part.kind === "foundation")!
      .position[0];
    const east = industrial.find((part) => part.position[0] > centre + 1)!;
    expect(
      assess(contract("wing"), run({ failedOrder: [east.id] })).result,
    ).toBe("failed");
  });

  test("sequential objectives pass in order and fail out of order", () => {
    // Step 1: every window out. Step 2: every roof down.
    const staged = {
      id: "staged",
      title: "Staged",
      brief: "",
      sequential: true,
      objectives: [
        { kind: "remove" as const, partKind: "window" as const },
        { kind: "remove" as const, partKind: "roof" as const },
      ],
    };
    const windows = industrial
      .filter((part) => part.kind === "window")
      .map((part) => part.id);
    const roofs = industrial
      .filter((part) => part.kind === "roof")
      .map((part) => part.id);

    expect(
      assess(staged, run({ failedOrder: [...windows, ...roofs] })).result,
    ).toBe("passed");
    expect(
      assess(staged, run({ failedOrder: [...roofs, ...windows] })),
    ).toMatchObject({ result: "failed", reason: /Out of order/ });
  });

  test.each(scenePresets.map((scene) => [scene.id, scene] as const))(
    "%s: every contract is winnable",
    (_id, scene) => {
      const parts = createBuilding(scene);
      // Quiet site needs a roof to remove.
      expect(parts.some((part) => part.kind === "roof")).toBe(true);

      // Partial demolition: cutting the whole west wing directly leaves the
      // east wing standing.
      const centre =
        parts.find((part) => part.kind === "foundation")?.position[0] ?? 0;
      const west = parts.filter((part) => part.position[0] < centre - 0.5);
      const fallen = analyzeStructuralSupport(
        parts,
        new Set(west.map((part) => part.id)),
      );
      expect(fallen.filter((part) => part.position[0] > centre + 0.5)).toEqual(
        [],
      );
    },
  );
});

describe("contract evaluators", () => {
  test("rule 6 keeps critical supports standing until the roof falls", () => {
    const roofIds = industrial
      .filter((part) => part.kind === "roof")
      .map((part) => part.id);
    const passState: ContractRun = {
      ...run(),
      failedOrder: [
        ...roofIds.map((id, index) => ({
          id,
          tool: "dynamite" as const,
          at: index + 1,
        })),
        ...industrial
          .filter((part) => !roofIds.includes(part.id))
          .map((part, index) => ({
            id: part.id,
            tool: "dynamite" as const,
            at: roofIds.length + index + 1,
          })),
      ],
      uses: [],
    };
    const failState = run({
      failedOrder: [site.critical[0], ...roofIds],
    });

    expect(assess(contract("staged"), passState).result).toBe("passed");
    expect(assess(contract("staged"), failState)).toMatchObject({
      result: "failed",
      reason: "A support went before the roof",
    });
    // A support lost while the whole roof is still up fails too.
    expect(
      assess(contract("staged"), run({ failedOrder: [site.critical[0]] })),
    ).toMatchObject({ result: "failed" });
  });

  test("rule 7 orders the sections west-to-centre-to-east", () => {
    const west = site.sections.west[0];
    const centre = site.sections.centre[0];
    const east = site.sections.east[0];

    const passState: ContractRun = {
      ...run(),
      failedOrder: industrial.map((part) => {
        const section = site.sections.west.includes(part.id)
          ? 1
          : site.sections.centre.includes(part.id)
            ? 2
            : 3;
        return {
          id: part.id,
          tool: "dynamite" as const,
          at: section,
        };
      }),
      uses: [],
    };
    const tieState: ContractRun = {
      ...run(),
      failedOrder: [
        { id: west, tool: "dynamite", at: 1 },
        { id: centre, tool: "dynamite", at: 2 },
        { id: east, tool: "dynamite", at: 2 },
      ],
      uses: [],
    };
    const outOfOrderState: ContractRun = {
      ...run(),
      failedOrder: [
        { id: east, tool: "dynamite", at: 1 },
        { id: west, tool: "dynamite", at: 2 },
        { id: centre, tool: "dynamite", at: 3 },
      ],
      uses: [],
    };

    expect(assess(contract("domino"), passState).result).toBe("passed");
    expect(assess(contract("domino"), tieState)).toMatchObject({
      result: "failed",
      reason: "Sections fell together, not in order",
    });
    expect(assess(contract("domino"), outOfOrderState)).toMatchObject({
      result: "failed",
      reason: "Sections fell out of order",
    });
  });

  test("rule 18 salvage is counted only when precise tools free it", () => {
    const salvageContract = contract("salvage");
    const salvageState: ContractRun = {
      ...run(),
      failedOrder: site.salvage.map((item) => ({
        id: item.id,
        tool: "plasma" as const,
        at: 1,
      })),
      uses: [],
    };
    const dynamiteState: ContractRun = {
      ...run(),
      failedOrder: site.salvage.map((item) => ({
        id: item.id,
        tool: "dynamite" as const,
        at: 1,
      })),
      uses: [],
    };

    const plasma = assess(salvageContract, salvageState);
    const dynamite = assess(salvageContract, dynamiteState);

    expect(
      plasma.objectives.find((objective) =>
        objective.label.startsWith("Salvage"),
      )?.done,
    ).toBe(true);
    expect(
      dynamite.objectives.find((objective) =>
        objective.label.startsWith("Salvage"),
      )?.done,
    ).toBe(false);
  });

  test("rule 20 uses the live/dormant hazard cycle and the blast window", () => {
    const hazard = site.hazard!;
    expect(hazardPhase(5)).toBe("live");
    expect(hazardPhase(15)).toBe("dormant");
    expect(hazardPhase(25)).toBe("live");

    const liveStrike: ContractRun = {
      ...run(),
      uses: [
        {
          tool: "hammer",
          at: 5,
          point: { x: hazard.x, z: hazard.z },
          radius: hazard.radius + 0.5,
        },
      ],
    };
    expect(assess(contract("gas"), liveStrike)).toMatchObject({
      result: "failed",
      reason: "Struck the gas leak while it was live",
    });

    const dormantBlast: ContractRun = {
      ...run(),
      failedOrder: [{ id: hazard.id, tool: "crusher", at: 15 }],
      uses: [],
    };
    expect(dormantHazardBlast(dormantBlast, site)).toBe(true);
  });

  test("each new contract is either unavailable or winnable in principle", () => {
    const parts = createBuilding(industrialScene);
    const newContracts = contracts.filter((entry) =>
      ["staged", "domino", "salvage", "gas"].includes(entry.id),
    );

    for (const item of newContracts) {
      const reason = contractAvailability(item, site, parts);
      if (reason !== null) {
        expect(reason).toBeTruthy();
        continue;
      }

      if (item.id === "staged") {
        const outcome = assess(
          item,
          run({
            failedOrder: [
              ...industrial
                .filter((part) => part.kind === "roof")
                .map((part) => part.id),
              ...site.critical,
            ],
          }),
        );
        expect(outcome.result).not.toBe("failed");
      }
      if (item.id === "domino") {
        const west = site.sections.west[0];
        const centre = site.sections.centre[0];
        const east = site.sections.east[0];
        const outcome = assess(item, {
          ...run(),
          failedOrder: [
            { id: west, tool: "dynamite", at: 1 },
            { id: centre, tool: "dynamite", at: 2 },
            { id: east, tool: "dynamite", at: 3 },
          ],
          uses: [],
        });
        expect(outcome.result).not.toBe("failed");
      }
      if (item.id === "salvage") {
        const outcome = assess(item, {
          ...run(),
          failedOrder: site.salvage.map((entry) => ({
            id: entry.id,
            tool: "plasma",
            at: 1,
          })),
          uses: [],
        });
        expect(
          outcome.objectives.find((objective) =>
            objective.label.startsWith("Salvage"),
          )?.done,
        ).toBe(true);
      }
      if (item.id === "gas") {
        expect(site.hazard).not.toBeNull();
      }
    }
  });
});

describe("site features", () => {
  test.each(scenePresets.map((scene) => [scene.id, scene] as const))(
    "%s: derived facts are consistent with the building",
    (_id, scene) => {
      const parts = createBuilding(scene);
      const ids = new Set(parts.map((part) => part.id));
      const facts = siteFeatures(scene);
      const byId = new Map(parts.map((part) => [part.id, part]));

      // Drop zone holds the whole building with a 4 m margin.
      for (const part of parts) {
        expect(part.position[0] - part.scale[0] / 2).toBeGreaterThanOrEqual(
          facts.dropZone.minX + 4 - 1e-9,
        );
        expect(part.position[2] + part.scale[2] / 2).toBeLessThanOrEqual(
          facts.dropZone.maxZ - 4 + 1e-9,
        );
      }
      // Sections partition the parts, west of centre of east.
      const sections = Object.values(facts.sections).flat();
      expect(sections.length).toBe(parts.length);
      expect(new Set(sections)).toEqual(ids);
      const meanX = (list: string[]) =>
        list.reduce((sum, id) => sum + byId.get(id)!.position[0], 0) /
        list.length;
      expect(meanX(facts.sections.west)).toBeLessThan(
        meanX(facts.sections.east),
      );
      // Critical, salvage and hazard name real parts of the right kind.
      facts.critical.forEach((id) =>
        expect(["column", "wall"]).toContain(byId.get(id)!.kind),
      );
      facts.salvage.forEach(({ id, value }) => {
        expect(["beam", "column"]).toContain(byId.get(id)!.kind);
        expect(value).toBeGreaterThan(0);
      });
      if (facts.hazard) {
        expect(byId.get(facts.hazard.id)!.material).toBe("steel");
      }
      // Roads exist only in some scenes (others have paths); rules that need
      // them are offered only there.
      facts.roads.forEach((road) => {
        expect(road.minX).toBeLessThan(road.maxX);
        expect(road.minZ).toBeLessThan(road.maxZ);
      });
      expect(facts.heritage).not.toBeNull();
    },
  );
});

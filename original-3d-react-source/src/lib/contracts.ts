import {
  createBuilding,
  createEnvironment,
  footprintXZ,
  type BuildingPartSpec,
  type ScenePreset,
  type ToolId,
} from "@/lib/destruction";

// Per-use tool economics. Energy (kJ) also drives the HUD's energy readout.
export const toolEnergy: Record<ToolId, number> = {
  hammer: 12.6,
  "wrecking-ball": 86.7,
  dynamite: 132.4,
  crusher: 204.8,
  plasma: 64.2,
};

export const toolCost: Record<ToolId, number> = {
  hammer: 150,
  "wrecking-ball": 1200,
  dynamite: 1800,
  crusher: 1500,
  plasma: 700,
};

// Relative noise and vibration of one use.
export const toolNoise: Record<ToolId, number> = {
  hammer: 2,
  "wrecking-ball": 6,
  dynamite: 10,
  crusher: 5,
  plasma: 1,
};

export type Objective =
  // The tallest standing part ends at or below this share of the original.
  | { kind: "height"; fraction: number }
  // Every part of this kind is down.
  | { kind: "remove"; partKind: BuildingPartSpec["kind"] }
  // At least this share of the west wing is down.
  | { kind: "west-wing"; fraction: number };

export type Contract = {
  id: string;
  title: string;
  brief: string;
  objectives: Objective[];
  // Objectives must be completed in the listed order.
  sequential?: boolean;
  charges?: { tool: ToolId; max: number };
  budget?: number;
  // Heavy tools need this many simulated seconds between uses.
  cooldown?: { tools: ToolId[]; seconds: number };
  energyCap?: number;
  timeLimit?: number;
  noiseCap?: number;
  // Loose debris pieces allowed on site when the objectives are met.
  debrisCap?: number;
  // No part of the east wing may fall.
  preserveEastWing?: boolean;
  // Rule 6: critical parts stay up until every roof part is down, then must
  // all come down.
  stagedSupports?: boolean;
  // Rule 7: sections start falling west, then centre, then east.
  domino?: boolean;
  // Rule 11: share of ground debris that must land inside the drop zone.
  dropZoneShare?: number;
  // Rule 13: no debris on, and no blast reaching, the heritage building.
  protectHeritage?: boolean;
  // Rule 16: no debris on road or rail surfaces.
  protectRoads?: boolean;
  // Rule 18: share (0-1) of the site's total salvage value that must be
  // freed by precise tools.
  salvageTarget?: number;
  // Rule 20: a hazard that cycles live and dormant.
  gasLeak?: boolean;
  // Rule 19: locked below this reputation.
  minReputation?: number;
  // Rule 9: lateral pull on falling debris, m/s².
  wind?: { x: number; z: number };
  // Rule 12.
  weather?: Weather;
};

export type Weather = "rain" | "fog" | "night";

// Contracts use only constraints the simulation measures: tool uses, energy,
// simulated time, debris on site and which parts have failed, in order.
// Wind, weather, drop zones, collateral and salvage need systems the demo
// does not model, so no contract claims them.
export const contracts: Contract[] = [
  {
    id: "free",
    title: "Free play",
    brief: "No limits. Bring the structure down however you like.",
    objectives: [],
  },
  {
    id: "charges",
    title: "Six charges",
    brief:
      "Six shaped charges, nothing else. Find the load paths that matter and bring the building below 40% of its height.",
    charges: { tool: "dynamite", max: 6 },
    objectives: [{ kind: "height", fraction: 0.4 }],
  },
  {
    id: "budget",
    title: "Tight budget",
    brief:
      "Every tool use costs money. Get the building below half its height for $9,000 or less.",
    budget: 9000,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
  {
    id: "quiet",
    title: "Quiet site",
    brief:
      "A hospital next door: keep noise and energy low. Take the roof off first, then cut the building below half its height.",
    noiseCap: 30,
    energyCap: 1200,
    sequential: true,
    objectives: [
      { kind: "remove", partKind: "roof" },
      { kind: "height", fraction: 0.5 },
    ],
  },
  {
    id: "wing",
    title: "Partial demolition",
    brief:
      "Clear the west wing. The east wing is being kept and must stay standing.",
    preserveEastWing: true,
    objectives: [{ kind: "west-wing", fraction: 0.7 }],
  },
  {
    id: "rush",
    title: "Rush job",
    brief:
      "90 seconds, heavy tools need 6 seconds to reset between uses, and the site must be left tidy: under 160 debris pieces.",
    timeLimit: 90,
    cooldown: { tools: ["wrecking-ball", "dynamite", "crusher"], seconds: 6 },
    debrisCap: 160,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
  {
    id: "staged",
    title: "Staged supports",
    brief:
      "Hold the critical supports until every roof is down, then bring the support frame down in a controlled sequence.",
    stagedSupports: true,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
  {
    id: "domino",
    title: "Domino",
    brief:
      "Let the west wing start, then the centre, and finally the east wing in a strict falling order.",
    domino: true,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
  {
    id: "salvage",
    title: "Salvage first",
    brief:
      "Free the steel and timber worth rescuing with precise tools before the site is cleared to the final height target.",
    salvageTarget: 0.6,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
  {
    id: "gas",
    title: "Gas leak",
    brief:
      "Track the live gas hazard and keep every impact clear of the leak path until the blast cycle is dormant.",
    gasLeak: true,
    objectives: [{ kind: "height", fraction: 0.5 }],
  },
];

// Axis-aligned site footprint, as produced by footprintXZ.
export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

export type ToolUse = {
  tool: ToolId;
  // Simulated seconds since the attempt's first tool use.
  at: number;
  point: { x: number; z: number };
  // Blast reach of this use (impactRadii[tool]).
  radius: number;
};

// A part that failed: the tool that caused it (collapses inherit their
// source tool) and the simulated time it fell.
export type FailedRecord = { id: string; tool: ToolId; at: number };

// A loose piece resting near the ground; r is its footprint radius, not a
// volume.
export type DebrisSnapshot = { x: number; z: number; r: number };

// Site facts the rules read, derived from the scene generators (which are not
// changed for them).
export type SiteFeatures = {
  // Building footprint grown by 4 m (rule 11).
  dropZone: Box;
  // Road and rail surfaces (rule 16).
  roads: Box[];
  // The neighbouring building closest to the site (rule 13).
  heritage: Box | null;
  // Part ids by thirds of the footprint along x (rule 7).
  sections: Record<"west" | "centre" | "east", string[]>;
  // Columns and ground-floor walls (rule 6).
  critical: string[];
  // Steel and wood beams and columns, value = volume × material rate (rule 18).
  salvage: { id: string; value: number }[];
  // The lowest steel part (rule 20).
  hazard: { id: string; x: number; z: number; radius: number } | null;
};

/** Shortest distance from a ground point to a box (0 inside or on it). */
export function boxDistance(x: number, z: number, box: Box) {
  const dx = Math.max(box.minX - x, 0, x - box.maxX);
  const dz = Math.max(box.minZ - z, 0, z - box.maxZ);
  return Math.hypot(dx, dz);
}

const SALVAGE_RATE: Partial<Record<BuildingPartSpec["material"], number>> = {
  steel: 900,
  wood: 300,
};

export function siteFeatures(scene: ScenePreset): SiteFeatures {
  const parts = createBuilding(scene);
  const footprint: Box = {
    minX: Math.min(...parts.map((p) => p.position[0] - p.scale[0] / 2)),
    maxX: Math.max(...parts.map((p) => p.position[0] + p.scale[0] / 2)),
    minZ: Math.min(...parts.map((p) => p.position[2] - p.scale[2] / 2)),
    maxZ: Math.max(...parts.map((p) => p.position[2] + p.scale[2] / 2)),
  };
  const environment = createEnvironment(scene);
  const centreX = (footprint.minX + footprint.maxX) / 2;
  const centreZ = (footprint.minZ + footprint.maxZ) / 2;
  const heritage =
    environment.props
      .filter((prop) => prop.kind === "building")
      .map((prop) => footprintXZ(prop.position, prop.scale, prop.rotation))
      .sort(
        (a, b) =>
          boxDistance(centreX, centreZ, a) - boxDistance(centreX, centreZ, b),
      )[0] ?? null;

  const third = (footprint.maxX - footprint.minX) / 3;
  const sectionOf = (part: BuildingPartSpec) =>
    part.position[0] < footprint.minX + third
      ? "west"
      : part.position[0] > footprint.maxX - third
        ? "east"
        : "centre";
  const sections: SiteFeatures["sections"] = { west: [], centre: [], east: [] };
  parts.forEach((part) => sections[sectionOf(part)].push(part.id));

  const hazardPart = parts
    .filter((part) => part.material === "steel")
    .sort(
      (a, b) => a.position[1] - b.position[1] || a.id.localeCompare(b.id),
    )[0];

  return {
    dropZone: {
      minX: footprint.minX - 4,
      maxX: footprint.maxX + 4,
      minZ: footprint.minZ - 4,
      maxZ: footprint.maxZ + 4,
    },
    roads: environment.surfaces
      .filter((surface) => surface.kind === "road" || surface.kind === "rail")
      .map((surface) =>
        footprintXZ(surface.position, surface.scale, surface.rotation),
      ),
    heritage,
    sections,
    critical: parts
      .filter(
        (part) =>
          part.kind === "column" || (part.kind === "wall" && part.level <= 1),
      )
      .map((part) => part.id),
    salvage: parts
      .filter(
        (part) =>
          (part.kind === "beam" || part.kind === "column") &&
          SALVAGE_RATE[part.material],
      )
      .map((part) => ({
        id: part.id,
        // At least 1, so thin rails still count as salvage.
        value: Math.max(
          1,
          Math.round(
            part.scale[0] *
              part.scale[1] *
              part.scale[2] *
              SALVAGE_RATE[part.material]!,
          ),
        ),
      })),
    hazard: hazardPart
      ? {
          id: hazardPart.id,
          x: hazardPart.position[0],
          z: hazardPart.position[2],
          radius: Math.max(hazardPart.scale[0], hazardPart.scale[2]) / 2 + 1,
        }
      : null,
  };
}

export type ContractRun = {
  uses: readonly ToolUse[];
  // Increments on every reset or contract change.
  attemptId: number;
  // Part ids in the order they failed.
  failedOrder: readonly FailedRecord[];
  // Simulated seconds since the first tool use.
  elapsed: number;
  debris: readonly DebrisSnapshot[];
};

export type ContractAssessment = {
  result: "running" | "passed" | "failed";
  reason?: string;
  objectives: { label: string; done: boolean }[];
  meters: { label: string; value: string; ok: boolean }[];
};

const MARGIN = 0.5;

function wingOf(part: BuildingPartSpec, centreX: number) {
  if (part.position[0] < centreX - MARGIN) return "west";
  if (part.position[0] > centreX + MARGIN) return "east";
  return "shared";
}

function standingHeight(
  parts: readonly BuildingPartSpec[],
  failed: ReadonlySet<string>,
) {
  let top = 0;
  for (const part of parts) {
    if (failed.has(part.id)) continue;
    top = Math.max(top, part.position[1] + part.scale[1] / 2);
  }
  return top;
}

function centreOf(parts: readonly BuildingPartSpec[]) {
  return (
    parts.find((part) => part.kind === "foundation")?.position[0] ??
    parts.reduce((sum, part) => sum + part.position[0], 0) /
      Math.max(1, parts.length)
  );
}

function objectiveMet(
  objective: Objective,
  parts: readonly BuildingPartSpec[],
  failed: ReadonlySet<string>,
  originalHeight: number,
  centreX: number,
) {
  switch (objective.kind) {
    case "height":
      return (
        standingHeight(parts, failed) <= originalHeight * objective.fraction
      );
    case "remove":
      return parts
        .filter((part) => part.kind === objective.partKind)
        .every((part) => failed.has(part.id));
    case "west-wing": {
      const wing = parts.filter((part) => wingOf(part, centreX) === "west");
      const down = wing.filter((part) => failed.has(part.id)).length;
      return down >= wing.length * objective.fraction;
    }
  }
}

function objectiveLabel(
  objective: Objective,
  parts: readonly BuildingPartSpec[],
  failed: ReadonlySet<string>,
  originalHeight: number,
  centreX: number,
) {
  switch (objective.kind) {
    case "height": {
      const limit = originalHeight * objective.fraction;
      return `Height ${standingHeight(parts, failed).toFixed(1)} m, target ≤ ${limit.toFixed(1)} m`;
    }
    case "remove":
      return `Remove every ${objective.partKind} part`;
    case "west-wing": {
      const wing = parts.filter((part) => wingOf(part, centreX) === "west");
      const down = wing.filter((part) => failed.has(part.id)).length;
      const needed = Math.ceil(wing.length * objective.fraction);
      return `West wing down ${down}/${needed} parts`;
    }
  }
}

const sum = (uses: readonly ToolUse[], table: Record<ToolId, number>) =>
  uses.reduce((total, use) => total + table[use.tool], 0);

/** Why `tool` cannot be used now under `contract`, or null if it can. */
export function toolBlockReason(
  contract: Contract,
  parts: readonly BuildingPartSpec[],
  run: ContractRun,
  tool: ToolId,
  site: SiteFeatures,
): string | null {
  const status = assessContract(contract, parts, run, site);
  if (status.result !== "running") return "Contract over - reset to retry";
  if (contract.charges && contract.charges.tool !== tool) {
    return `This contract allows only the ${contract.charges.tool}`;
  }
  if (contract.charges) {
    const used = run.uses.filter((use) => use.tool === tool).length;
    if (used >= contract.charges.max) return "No charges left";
  }
  if (
    contract.budget !== undefined &&
    sum(run.uses, toolCost) + toolCost[tool] > contract.budget
  ) {
    return "Not enough budget left for this tool";
  }
  if (
    contract.energyCap !== undefined &&
    sum(run.uses, toolEnergy) + toolEnergy[tool] > contract.energyCap
  ) {
    return "Not enough energy left for this tool";
  }
  if (contract.cooldown?.tools.includes(tool)) {
    const last = [...run.uses].reverse().find((use) => use.tool === tool);
    if (last && run.elapsed - last.at < contract.cooldown.seconds) {
      const wait = contract.cooldown.seconds - (run.elapsed - last.at);
      return `Cooling down - ${Math.ceil(wait)} s`;
    }
  }
  return null;
}

export function hazardPhase(elapsed: number): "live" | "dormant" {
  return elapsed % 20 < 10 ? "live" : "dormant";
}

export function dormantHazardBlast(
  run: ContractRun,
  site: SiteFeatures,
): boolean {
  if (!site.hazard) return false;
  return run.failedOrder.some(
    (record) =>
      record.id === site.hazard!.id && hazardPhase(record.at) === "dormant",
  );
}

export function contractAvailability(
  contract: Contract,
  site: SiteFeatures,
  parts: readonly BuildingPartSpec[],
): string | null {
  if (contract.stagedSupports) {
    if (!parts.some((part) => part.kind === "roof")) {
      return "Need at least one roof part";
    }
    if (site.critical.length === 0) {
      return "Need at least one critical support";
    }
  }
  if (contract.domino) {
    if (Object.values(site.sections).some((section) => section.length === 0)) {
      return "Every section must exist";
    }
  }
  if (contract.salvageTarget !== undefined) {
    const total = site.salvage.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return "Need salvage value on site";
    }
  }
  if (contract.gasLeak && !site.hazard) {
    return "Need a gas leak hazard";
  }
  return null;
}

export function assessContract(
  contract: Contract,
  parts: readonly BuildingPartSpec[],
  run: ContractRun,
  site: SiteFeatures,
): ContractAssessment {
  const failed = new Set(run.failedOrder.map((record) => record.id));
  const originalHeight = standingHeight(parts, new Set());
  const centreX = centreOf(parts);
  const objectives = contract.objectives.map((objective) => ({
    label: objectiveLabel(objective, parts, failed, originalHeight, centreX),
    done: objectiveMet(objective, parts, failed, originalHeight, centreX),
  }));

  if (contract.stagedSupports && site.critical.length > 0) {
    const roofIds = parts
      .filter((part) => part.kind === "roof")
      .map((part) => part.id);
    const roofTimes = new Map<string, number>();
    run.failedOrder.forEach((record) => {
      if (roofIds.includes(record.id)) {
        roofTimes.set(record.id, record.at);
      }
    });
    // Step 1 is met when the last roof part fell; never, while one stands.
    const roofOffAt = roofIds.every((id) => roofTimes.has(id))
      ? Math.max(...roofIds.map((id) => roofTimes.get(id)!))
      : Infinity;
    const criticalBeforeRoof = site.critical.some((id) => {
      const time = run.failedOrder.find((record) => record.id === id)?.at;
      return time !== undefined && time < roofOffAt;
    });
    if (criticalBeforeRoof) {
      return {
        result: "failed",
        reason: "A support went before the roof",
        objectives,
        meters: [],
      };
    }
    const down = site.critical.filter((id) => failed.has(id)).length;
    objectives.push({
      label: `Critical supports down ${down}/${site.critical.length}`,
      done: down === site.critical.length,
    });
  }

  if (contract.domino) {
    const sectionStarts = Object.fromEntries(
      (Object.keys(site.sections) as Array<keyof typeof site.sections>).map(
        (section) => {
          const start = site.sections[section].reduce((earliest, id) => {
            const at =
              run.failedOrder.find((record) => record.id === id)?.at ??
              Infinity;
            return Math.min(earliest, at);
          }, Infinity);
          return [section, start];
        },
      ),
    ) as Record<"west" | "centre" | "east", number>;
    const started = Object.values(sectionStarts).filter(Number.isFinite);
    const tied =
      started.length >= 2 &&
      started.some((value, index) =>
        started.slice(index + 1).some((other) => other === value),
      );
    const rangeOrdered =
      sectionStarts.west < sectionStarts.centre &&
      sectionStarts.centre < sectionStarts.east &&
      started.length === 3;
    if (tied) {
      return {
        result: "failed",
        reason: "Sections fell together, not in order",
        objectives,
        meters: [],
      };
    }
    if (started.length === 3 && !rangeOrdered) {
      return {
        result: "failed",
        reason: "Sections fell out of order",
        objectives,
        meters: [],
      };
    }
    objectives.push({
      label: "Domino west → centre → east",
      done: rangeOrdered,
    });
  }

  const meters: ContractAssessment["meters"] = [];
  const noise = sum(run.uses, toolNoise);
  const energy = sum(run.uses, toolEnergy);
  if (contract.charges) {
    const used = run.uses.filter(
      (use) => use.tool === contract.charges!.tool,
    ).length;
    meters.push({
      label: "Charges",
      value: `${contract.charges.max - used} of ${contract.charges.max} left`,
      ok: used < contract.charges.max,
    });
  }
  if (contract.budget !== undefined) {
    const spent = sum(run.uses, toolCost);
    meters.push({
      label: "Budget",
      value: `$${spent.toLocaleString("en-US")} / $${contract.budget.toLocaleString("en-US")}`,
      ok: spent <= contract.budget,
    });
  }
  if (contract.energyCap !== undefined) {
    meters.push({
      label: "Energy",
      value: `${Math.round(energy)} / ${contract.energyCap} kJ`,
      ok: energy <= contract.energyCap,
    });
  }
  if (contract.noiseCap !== undefined) {
    meters.push({
      label: "Noise",
      value: `${noise} / ${contract.noiseCap}`,
      ok: noise <= contract.noiseCap,
    });
  }
  if (contract.timeLimit !== undefined) {
    meters.push({
      label: "Time",
      value: `${Math.floor(run.elapsed)} / ${contract.timeLimit} s`,
      ok: run.elapsed <= contract.timeLimit,
    });
  }
  if (contract.debrisCap !== undefined) {
    meters.push({
      label: "Debris",
      value: `${run.debris.length} / ${contract.debrisCap}`,
      ok: run.debris.length <= contract.debrisCap,
    });
  }
  if (contract.cooldown) {
    const cooling = contract.cooldown.tools.filter((tool) => {
      const last = [...run.uses].reverse().find((use) => use.tool === tool);
      return last && run.elapsed - last.at < contract.cooldown!.seconds;
    });
    meters.push({
      label: "Heavy tools",
      value: cooling.length ? "Cooling down" : "Ready",
      ok: true,
    });
  }
  if (contract.salvageTarget !== undefined && site.salvage.length > 0) {
    const recovered = site.salvage.reduce((total, item) => {
      const wasRecovered = run.failedOrder.some(
        (record) =>
          record.id === item.id &&
          (record.tool === "plasma" ||
            record.tool === "hammer" ||
            record.tool === "crusher"),
      );
      return total + (wasRecovered ? item.value : 0);
    }, 0);
    const total = site.salvage.reduce((sum, item) => sum + item.value, 0);
    const target = Math.ceil(total * contract.salvageTarget);
    meters.push({
      label: "Salvage",
      value: `${recovered} / ${target}`,
      ok: recovered >= total * contract.salvageTarget,
    });
    objectives.push({
      label: `Salvage ${recovered} / ${target}`,
      done: recovered >= total * contract.salvageTarget,
    });
  }
  if (contract.gasLeak && site.hazard) {
    const strike = run.uses.some(
      (use) =>
        hazardPhase(use.at) === "live" &&
        Math.hypot(
          use.point.x - site.hazard!.x,
          use.point.z - site.hazard!.z,
        ) <=
          use.radius + site.hazard!.radius,
    );
    if (strike) {
      return {
        result: "failed",
        reason: "Struck the gas leak while it was live",
        objectives,
        meters,
      };
    }
    const phase = hazardPhase(run.elapsed);
    meters.push({
      label: "Gas leak",
      value: phase === "live" ? "Live" : "Dormant",
      ok: true,
    });
  }

  const fail = (reason: string): ContractAssessment => ({
    result: "failed",
    reason,
    objectives,
    meters,
  });
  if (contract.id === "free") return { result: "running", objectives, meters };

  if (
    contract.preserveEastWing &&
    parts.some(
      (part) => wingOf(part, centreX) === "east" && failed.has(part.id),
    )
  ) {
    return fail("Part of the east wing fell");
  }
  if (contract.noiseCap !== undefined && noise > contract.noiseCap) {
    return fail("Noise limit broken");
  }

  if (contract.sequential) {
    // Replay the failures to find when each objective was first met.
    const metAt = contract.objectives.map(() => Infinity);
    const sofar = new Set<string>();
    const check = (index: number) => {
      contract.objectives.forEach((objective, i) => {
        if (
          metAt[i] === Infinity &&
          objectiveMet(objective, parts, sofar, originalHeight, centreX)
        ) {
          metAt[i] = index;
        }
      });
    };
    check(-1);
    run.failedOrder.forEach(({ id }, index) => {
      sofar.add(id);
      check(index);
    });
    for (let i = 1; i < metAt.length; i += 1) {
      if (metAt[i] !== Infinity && metAt[i] < metAt[i - 1]) {
        return fail(`Out of order: step ${i + 1} before step ${i}`);
      }
    }
  }

  if (objectives.every((objective) => objective.done)) {
    if (
      contract.debrisCap !== undefined &&
      run.debris.length > contract.debrisCap
    ) {
      return fail("Too much debris left on site");
    }
    return { result: "passed", objectives, meters };
  }
  if (contract.timeLimit !== undefined && run.elapsed > contract.timeLimit) {
    return fail("Out of time");
  }
  return { result: "running", objectives, meters };
}

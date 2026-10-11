import type {
  GameSystemEntry,
  PublicDetail,
  ToolEntry,
  ToolGroup,
  ToolUtility,
} from "@/lib/types";

export const standaloneToolProjectSlugs = [
  "project-pulse",
  "money-planner",
  "wallpaper-workbench",
  "civitai-asset-manager",
];

type ToolUtilitySeed = Pick<ToolUtility, "title" | "description" | "status">;

type ToolGroupSeed = Omit<ToolGroup, "tools"> & {
  tools: ToolUtilitySeed[];
};

type ToolEntrySeed = Omit<ToolEntry, "detail">;
type GameSystemSeed = Omit<GameSystemEntry, "detail">;

type GroupNarrative = {
  constraint: string;
  highlight: string;
  proof: string;
};

const groupTechnologies: Record<string, string[]> = {
  "content-ui": ["Unity Editor", "C#", "uGUI", "TextMeshPro", "Addressables"],
  "world-authoring": [
    "Unity Editor",
    "C#",
    "Physics",
    "Scene view",
    "Procedural generation",
  ],
  "gameplay-content": [
    "Unity Editor",
    "C#",
    "MMFeedbacks",
    "ScriptableObjects",
    "JSON",
  ],
  "release-automation": [
    "Unity Editor",
    "C#",
    "Android",
    "SHA-256",
    "UnityPackage",
  ],
  quality: ["Unity Editor", "C#", "Validation", "JSON", "ScriptableObjects"],
  diagnostics: [
    "Unity Editor",
    "C#",
    "Play Mode",
    "Scene view",
    "Automated testing",
  ],
};

const groupNarratives: Record<string, GroupNarrative> = {
  "content-ui": {
    constraint:
      "Generated UI must preserve navigation, catalog, and runtime ownership rules while remaining safe to rerun.",
    highlight:
      "The utility produces editor-visible artifacts that use the same prefab and catalog contracts as the shipped interface.",
    proof:
      "Outputs can be inspected before Play Mode and validated again through the runtime catalog.",
  },
  "world-authoring": {
    constraint:
      "Spatial tools must respect authored pivots, collision boundaries, access routes, and deterministic regeneration.",
    highlight:
      "Scene-view evidence and focused validation keep physical content readable before a complete settlement is built.",
    proof:
      "The resulting scene or prefab can be regenerated and checked against the same spatial rules.",
  },
  "gameplay-content": {
    constraint:
      "Editor-authored timing, inventory data, effects, and damage behavior must agree without hard-wiring one tool path.",
    highlight:
      "Configuration is resolved into shared runtime contracts so distinct tools retain their identity without duplicating orchestration code.",
    proof:
      "Catalog inspection exposes missing mappings and timing drift before a gameplay build is prepared.",
  },
  "release-automation": {
    constraint:
      "Build and import operations need traceable inputs, explicit rejection boundaries, and recoverable outputs.",
    highlight:
      "Version, dependency, and validation evidence travel with the generated artifact instead of living in an undocumented checklist.",
    proof:
      "Each operation leaves an inspectable build, package, import report, or timestamped diagnostic artifact.",
  },
  quality: {
    constraint:
      "A focused validator must report the source of malformed content without mutating production data behind the developer's back.",
    highlight:
      "Checks follow the same catalogs, policy assets, and service boundaries used by runtime systems.",
    proof:
      "Failures surface as editor evidence before they become distant Play Mode or device errors.",
  },
  diagnostics: {
    constraint:
      "Debug controls must shorten iteration without leaking into production behavior or corrupting durable player state.",
    highlight:
      "The utility exposes a narrow test action and the runtime state needed to understand its result.",
    proof:
      "A repeatable editor action replaces multi-step manual setup for the targeted test loop.",
  },
};

function utilitySlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function utilityResult(tool: ToolUtilitySeed) {
  const outcomes: Record<ToolUtility["status"], string> = {
    Production:
      "Available as a repeatable production workflow with an inspectable output and clear editor entry point.",
    Automatic:
      "Runs automatically at the relevant project lifecycle point so the associated catalog or evidence stays current.",
    Debug:
      "Shortens iteration by exposing runtime state and repeatable test actions without modifying production flows.",
    Partial:
      "The useful path is implemented and its remaining boundary is exposed honestly instead of being presented as complete.",
    Legacy:
      "Retained for compatibility and migration support while newer configuration workflows become the default.",
  };
  return outcomes[tool.status];
}

function suitePublicDetail(tool: ToolEntrySeed): PublicDetail {
  return {
    scope: `Owned as an editor-facing workflow spanning ${tool.category.toLowerCase()}, validation, and handoff into production content.`,
    constraints: [
      tool.problem,
      "The public case study must demonstrate engineering judgment without publishing private source, provider credentials, or proprietary project data.",
    ],
    engineeringHighlights: [
      tool.solution,
      "Generated artifacts stay connected to the same catalogs and contracts consumed by the runtime instead of becoming a parallel editor-only format.",
    ],
    proofPoints: [
      tool.result,
      "Inputs, generated outputs, and validation results remain visible before device testing.",
    ],
    disclosure:
      "The portfolio describes workflow boundaries and observable outcomes; private prompts, credentials, source, and project-specific tuning are intentionally omitted.",
  };
}

function utilityPublicDetail(
  group: ToolGroupSeed,
  tool: ToolUtilitySeed,
): PublicDetail {
  const narrative = groupNarratives[group.slug];
  return {
    scope: `${tool.title} is a focused ${group.eyebrow.toLowerCase()} utility that turns a recurring production task into an inspectable editor workflow.`,
    constraints: [
      `${tool.description} The operation must remain understandable and safe to repeat as project content evolves.`,
      narrative.constraint,
    ],
    engineeringHighlights: [tool.description, narrative.highlight],
    proofPoints: [utilityResult(tool), narrative.proof],
    disclosure:
      "Only the workflow contract and public-safe evidence are summarized here; project source, asset contents, and private configuration remain excluded.",
  };
}

function gameSystemPublicDetail(system: GameSystemSeed): PublicDetail {
  return {
    scope: `Designed the ${system.title.toLowerCase()} boundary and its integration points with gameplay, authored content, persistence, and presentation where applicable.`,
    constraints: [
      system.problem,
      "The system must remain observable and testable while avoiding direct ownership of neighboring features.",
    ],
    engineeringHighlights: [
      system.solution,
      "Explicit state and event boundaries let adjacent systems react without duplicating the source system's rules.",
    ],
    proofPoints: [
      system.result,
      "Behavior is represented through configuration, editor diagnostics, or focused automated evidence in the project.",
    ],
    disclosure:
      "This overview intentionally omits private source, tuning values, unreleased content, and internal production documents.",
  };
}

function enrichToolGroup(group: ToolGroupSeed): ToolGroup {
  return {
    ...group,
    tools: group.tools.map((tool) => ({
      ...tool,
      slug: utilitySlug(tool.title),
      problem: `Without a repeatable ${tool.title.toLowerCase()} workflow, setup and validation depend on manual steps that are difficult to audit or reproduce.`,
      solution: tool.description,
      result: utilityResult(tool),
      technologies: groupTechnologies[group.slug],
      detail: utilityPublicDetail(group, tool),
    })),
  };
}

const toolSeeds: ToolEntrySeed[] = [
  {
    slug: "style-ai-pipeline",
    category: "Art direction and UI production",
    title: "Style Guide and AI UI Pipeline",
    problem:
      "A growing game needs one visual language across screens, components, prompts, generated art, and implementation decisions.",
    solution:
      "Import live project data into an authored style system, generate design and architecture documents, run image providers, enforce approval policy, and build approved prefabs and scripts.",
    technologies: ["Unity Editor", "C#", "OpenAI", "Gemini", "ComfyUI"],
    result:
      "One editor suite connects art direction, prompt coverage, AI generation, review gates, Addressables registration, and implementation manifests.",
  },
  {
    slug: "ui-production",
    category: "UI authoring",
    title: "UI and Popup Production Suite",
    problem:
      "Repeatedly assembling screen hierarchies, scripts, serialized references, navigation definitions, and catalogs slows feature work and invites drift.",
    solution:
      "Generate production screen batches and configurable popup families, then register the results into the same navigation and popup catalogs used at runtime.",
    technologies: ["Unity Editor", "C#", "uGUI", "TextMeshPro", "Addressables"],
    result:
      "The pipeline covers the core HUD, menus, maps, settings, loadout, shop, blockers, and reusable popup patterns.",
  },
  {
    slug: "tool-effects-pipeline",
    category: "Gameplay content authoring",
    title: "Tool Effect Authoring Pipeline",
    problem:
      "Every demolition tool needs a coordinated prefab, animation flow, inventory item, feedback timing, icon, and catalog mapping.",
    solution:
      "Scan tool definitions, generate or update effect prefabs and inventory assets, synchronize flow profiles, validate mappings, and keep icon registries current automatically.",
    technologies: [
      "Unity Editor",
      "C#",
      "MMFeedbacks",
      "JSON",
      "ScriptableObjects",
    ],
    result:
      "New tools can move from configuration to wired gameplay content through one repeatable editor workflow.",
  },
  {
    slug: "destruction-world-planning",
    category: "World and systems design",
    title: "Destruction and Settlement Planning Lab",
    problem:
      "Procedural cities must remain readable and traversable while reserving believable space for blast radii, debris, collapse, roads, and ambient life.",
    solution:
      "Preview planner output, compare generation strategies, tune road and settlement grammar, inspect validation issues, and project the complete plan into Scene-view gizmos.",
    technologies: [
      "Unity Editor",
      "C#",
      "Procedural generation",
      "Gizmos",
      "Deterministic seeds",
    ],
    result:
      "Design, debugging, and spatial validation happen before a full runtime settlement is built.",
  },
  {
    slug: "building-fracture-authoring",
    category: "Destruction content pipeline",
    title: "Building and Fracture Authoring Suite",
    problem:
      "Preparing destructible buildings by hand requires repetitive hierarchy, collider, layer, material, fracture, and validation work.",
    solution:
      "Create, convert, organize, validate, and prefracture building prefabs, with quick setup for parts, debris, materials, and a playable wrecking-ball rig.",
    technologies: [
      "Unity Editor",
      "C#",
      "OpenFracture",
      "Physics",
      "PrefabUtility",
    ],
    result:
      "The suite turns raw models into testable destruction content with consistent runtime contracts.",
  },
  {
    slug: "build-release-automation",
    category: "Engineering automation",
    title: "Build, Release, and Reuse Automation",
    problem:
      "Release candidates, reusable modules, imported asset packs, logs, and platform checks all need traceable, repeatable handling.",
    solution:
      "Automate Android RC builds and metadata, export modular Unity packages, validate contained AssetForge transports, capture logs, and exercise device resolutions.",
    technologies: ["Unity Editor", "C#", "Android", "SHA-256", "UnityPackage"],
    result:
      "Build and content operations produce inspectable artifacts instead of relying on undocumented manual steps.",
  },
];

export const tools: ToolEntry[] = toolSeeds.map((tool) => ({
  ...tool,
  detail: suitePublicDetail(tool),
}));

const toolGroupSeeds: ToolGroupSeed[] = [
  {
    slug: "content-ui",
    eyebrow: "Content and UI",
    title: "Production authoring",
    description:
      "Tools that create repeatable UI and content artifacts while keeping runtime catalogs synchronized.",
    tools: [
      {
        title: "Style Guide and AI UI Pipeline",
        description:
          "Project-aware visual specification, prompt generation, provider integration, approval gates, and approved asset building.",
        status: "Production",
      },
      {
        title: "UI Prefab Batch Builder",
        description:
          "Builds and registers the HUD, menus, maps, settings, loadout, shop, blockers, and update screens.",
        status: "Production",
      },
      {
        title: "Popup Creator",
        description:
          "Creates, extends, or replaces popup scripts and prefabs from twenty presets, then updates the popup catalog.",
        status: "Production",
      },
      {
        title: "Addressables JSON Configurator",
        description:
          "Creates standardized building and settlement configuration entries and reports existing groups.",
        status: "Legacy",
      },
    ],
  },
  {
    slug: "world-authoring",
    eyebrow: "World authoring",
    title: "Destruction and environment tools",
    description:
      "Scene and prefab workflows for planning settlements and preparing physical destruction content.",
    tools: [
      {
        title: "Destruction Planner Preview",
        description:
          "Compares planner strategies and exposes roads, water, density, buffers, traffic, validation, and coverage statistics.",
        status: "Production",
      },
      {
        title: "Settlement Plan Gizmo View",
        description:
          "Draws parcels, roads, buffers, vegetation, water, traffic, and collapse direction directly in the Scene view.",
        status: "Production",
      },
      {
        title: "Building Prefab Creator",
        description:
          "Builds structured building prefabs with parts, colliders, materials, debris, models, and fracture preparation.",
        status: "Production",
      },
      {
        title: "Building Prefab Validator",
        description:
          "Checks root configuration, layers, part components, colliders, and required containers before use.",
        status: "Production",
      },
      {
        title: "Building Quick Setup",
        description:
          "Converts selected hierarchies into buildings and automatically organizes child meshes into damageable parts.",
        status: "Production",
      },
      {
        title: "Prefracture Setup Assistant",
        description:
          "Validates mesh prerequisites and scaffolds OpenFracture materials and setup guidance.",
        status: "Partial",
      },
      {
        title: "Wrecking Ball Rig Quick Setup",
        description:
          "Creates and wires an anchor, cable, rigidbody ball, collider, and gameplay rig controller.",
        status: "Production",
      },
      {
        title: "Procedural Spline Road Builder",
        description:
          "Regenerates spline-driven road geometry while authoring the scene.",
        status: "Production",
      },
      {
        title: "View Bounding Box Generator",
        description:
          "Creates four edge colliders from the playable floor bounds.",
        status: "Production",
      },
    ],
  },
  {
    slug: "gameplay-content",
    eyebrow: "Gameplay content",
    title: "Tool effects and setup",
    description:
      "Automation for converting demolition-tool configuration into complete, testable gameplay assets.",
    tools: [
      {
        title: "Tool Effect Prefab and Mapping Generator",
        description:
          "Upserts effect prefabs, mappings, inventory items, flow profiles, and scene-handler assignments from tool definitions.",
        status: "Production",
      },
      {
        title: "Generic Tool Effect Prefab Creator",
        description:
          "Creates individual or batch effect prefabs with animator, feedback stages, particles, timing, and rig controllers.",
        status: "Production",
      },
      {
        title: "Tool Effect Catalog Inspector",
        description:
          "Validates duplicates, missing prefabs, fallback behavior, and unmapped tool definitions.",
        status: "Production",
      },
      {
        title: "Tool Icon Registry Auto-Sync",
        description:
          "Keeps icon registries synchronized whenever tool configuration changes.",
        status: "Automatic",
      },
      {
        title: "Physics Layer Setup",
        description:
          "Creates and verifies the Fragment layer and its collision matrix.",
        status: "Production",
      },
      {
        title: "Damage Type Creator",
        description:
          "Menu surface exists for standard damage assets, but the creation implementation is currently dormant.",
        status: "Partial",
      },
    ],
  },
  {
    slug: "release-automation",
    eyebrow: "Engineering operations",
    title: "Build, import, and reuse",
    description:
      "Repeatable release and asset operations with validation, metadata, and rollback boundaries.",
    tools: [
      {
        title: "Android RC Build Pipeline",
        description:
          "Builds versioned AAB release candidates with build number, channel, git hash, Unity version, and metadata JSON.",
        status: "Production",
      },
      {
        title: "Reusable Systems Package Exporter",
        description:
          "Exports nineteen selectable Unity packages spanning core services, product systems, tool effects, dice, and destruction.",
        status: "Production",
      },
      {
        title: "AssetForge Transport Importer",
        description:
          "Validates schema, Unity version, hashes, GUIDs, and dependency containment before versioned import, with rollback on rejection.",
        status: "Production",
      },
      {
        title: "Timestamped Unity Log Exporter",
        description:
          "Captures Play Mode output and automatically writes a timestamped log when the session ends.",
        status: "Automatic",
      },
      {
        title: "Mobile Resolution Switcher",
        description:
          "Maintains phone, tablet, and foldable presets and applies custom Game-view sizes with automatic zoom fitting.",
        status: "Production",
      },
    ],
  },
  {
    slug: "quality",
    eyebrow: "Quality gates",
    title: "Validation and configuration checks",
    description:
      "Focused checks that catch missing dependencies and malformed content before runtime testing.",
    tools: [
      {
        title: "Project Validator",
        description:
          "Scans prefabs, ScriptableObjects, and audio assets for missing references; material and texture checks remain unfinished.",
        status: "Partial",
      },
      {
        title: "Analytics Consent Validator",
        description:
          "Checks policy assets, scene bridges, presenters, and service registration.",
        status: "Production",
      },
      {
        title: "Firebase Bootstrap Validator",
        description:
          "Checks bootstrap automation, push-notification integration, and Firebase service registration.",
        status: "Production",
      },
      {
        title: "Cosmetic Catalog Validator",
        description: "Parses and validates the runtime cosmetic catalog.",
        status: "Production",
      },
      {
        title: "Shop Catalog Validator",
        description:
          "Parses and validates shop products and purchase configuration.",
        status: "Production",
      },
      {
        title: "Powerup Runtime Config Validator",
        description: "Parses and validates runtime powerup definitions.",
        status: "Production",
      },
      {
        title: "System Automation Feedback Validator",
        description:
          "Checks duplicate features, execution order, and VFX or audio fallbacks.",
        status: "Production",
      },
    ],
  },
  {
    slug: "diagnostics",
    eyebrow: "Testing and diagnostics",
    title: "Fast iteration helpers",
    description:
      "Play Mode inspectors, context commands, and Scene-view diagnostics built to shorten test loops.",
    tools: [
      {
        title: "Development Progression Debugger",
        description:
          "Edits XP, currency, contracts, and local save state during Play Mode.",
        status: "Debug",
      },
      {
        title: "Dice Simulation Inspector",
        description:
          "Shows recording coverage and cache state, clears recordings, and pre-generates all 120 simulation variants.",
        status: "Debug",
      },
      {
        title: "Settlement Generation Test Harness",
        description:
          "Runs preset and ID-based settlement builds with cleanup and road or building diagnostics.",
        status: "Debug",
      },
      {
        title: "Destruction Test Harness",
        description:
          "Exercises weak points, supports, fragments, percentage damage, instant destruction, and scene reset.",
        status: "Debug",
      },
      {
        title: "Building Generation Debugger",
        description:
          "Visualizes bounds and health in the Scene view and reports generation statistics in the inspector.",
        status: "Debug",
      },
      {
        title: "Dice Face Mapping Validator",
        description:
          "Verifies primary and alternate face rotations and up vectors.",
        status: "Debug",
      },
      {
        title: "Tool Effect Trigger Tester",
        description:
          "Manually invokes effect impact and completion stages from the inspector.",
        status: "Debug",
      },
      {
        title: "Runtime Context Commands",
        description:
          "Logs bootstrap status, restarts settlements, completes contracts, and drives top-down building destruction.",
        status: "Debug",
      },
    ],
  },
];
export const toolGroups: ToolGroup[] = toolGroupSeeds.map(enrichToolGroup);

const gameSystemSeeds: GameSystemSeed[] = [
  {
    slug: "destructible-building-parts",
    category: "Structural destruction",
    title: "Destructible building parts",
    summary:
      "Part-level damage, weak points, fragments, dependencies, and collapse feedback.",
    problem:
      "Undirected rigidbody destruction makes tool choice unreadable and leaves gameplay objectives disconnected from the structure.",
    solution:
      "Building and part contracts track health, damage types, weak points, support relationships, fragment release, and destruction events.",
    result:
      "Damage remains local and measurable while structural failures can drive score, contracts, traffic reactions, and HUD feedback.",
    technologies: ["Unity", "C#", "Physics", "Event-driven systems"],
  },
  {
    slug: "demolition-loadouts",
    category: "Tool systems",
    title: "Demolition loadouts",
    summary:
      "Configuration-driven tool selection, inventory use, effects, and impact timing.",
    problem:
      "A broad demolition roster needs consistent ownership rules and feedback without hard-wiring every tool into input code.",
    solution:
      "The loadout flow resolves configured inventory tools into animation profiles, damage rules, effect mappings, and target impacts.",
    result:
      "New impact tools, explosives, cutters, and heavy machinery share one playable contract while retaining distinct behavior.",
    technologies: ["Unity", "C#", "ScriptableObjects", "MMFeedbacks"],
  },
  {
    slug: "procedural-settlements",
    category: "World generation",
    title: "Procedural settlements",
    summary:
      "Deterministic building, road, environment, and access planning for contract spaces.",
    problem:
      "Generated settlements must vary without blocking facades, roads, traffic, or safe demolition space.",
    solution:
      "Planner-driven layout stages reserve parcels, road access, environment zones, collapse buffers, and deterministic validation evidence.",
    result:
      "The same seed can be inspected and regenerated while different profiles still produce materially different settlements.",
    technologies: [
      "Unity",
      "C#",
      "Procedural generation",
      "Deterministic seeds",
    ],
  },
  {
    slug: "contracts-and-progression",
    category: "Player progression",
    title: "Contracts and progression",
    summary:
      "Objectives, completion, rewards, score, experience, and route progression.",
    problem:
      "Destruction needs a clear player purpose and a reliable path from target selection to reward settlement.",
    solution:
      "Contracts publish objective progress from building events and feed completion into economy, experience, unlock, and navigation systems.",
    result:
      "The demolition loop has explicit goals and inspectable reward boundaries rather than ending when physics activity stops.",
    technologies: ["Unity", "C#", "Events", "Configuration-driven content"],
  },
  {
    slug: "mobile-economy",
    category: "Product systems",
    title: "Mobile economy",
    summary:
      "Wallet, rewards, shop, powerups, cosmetics, and monetization boundaries.",
    problem:
      "Mobile progression systems become fragile when currency, purchases, unlocks, and rewards mutate state independently.",
    solution:
      "Economy services centralize wallet changes, product configuration, rewards, ownership, and persistence behind testable contracts.",
    result:
      "Gameplay rewards and product features can evolve without bypassing ownership or save-state rules.",
    technologies: ["Unity", "C#", "JSON", "Persistence", "Automated tests"],
  },
  {
    slug: "automated-system-checks",
    category: "Quality gates",
    title: "Automated system checks",
    summary:
      "Validation of catalogs, policies, dependencies, and gameplay configuration.",
    problem:
      "A manager-heavy Unity project can enter Play Mode with missing services or malformed content that fails far from its source.",
    solution:
      "Focused validators inspect service registration, catalogs, configuration files, policies, effects, and required scene bridges.",
    result:
      "Setup failures surface as specific editor evidence before they become device or runtime debugging sessions.",
    technologies: ["Unity Editor", "C#", "Validation", "EditMode tests"],
  },
  {
    slug: "tool-effect-runtime",
    category: "Gameplay feedback",
    title: "Tool-effect runtime",
    summary:
      "Reusable impact stages that coordinate animation, feedback, damage, and completion.",
    problem:
      "Visual effects and actual damage drift when each tool owns a separate timing implementation.",
    solution:
      "Configured flow profiles coordinate preparation, impact, completion, particles, feedback, and damage application through shared runtime handlers.",
    result:
      "Editor-authored effects reach gameplay with timing that remains testable and consistent with inventory use.",
    technologies: ["Unity", "C#", "MMFeedbacks", "Animation"],
  },
  {
    slug: "dice-energy-profiles",
    category: "Player strategy",
    title: "Dice energy profiles",
    summary:
      "Dice outcomes translated into reusable demolition energy and tool modifiers.",
    problem:
      "Simple damage charges do not create enough strategic distinction between rolls, tools, and target structures.",
    solution:
      "The evolving profile model separates recorded dice presentation from gameplay energy, modifiers, and target resolution.",
    result:
      "Dice can become a strategic input to demolition instead of remaining a flat multiplier attached to one hit.",
    technologies: ["Unity", "C#", "Recorded simulation", "Domain modeling"],
  },
  {
    slug: "save-and-progression",
    category: "Persistence",
    title: "Save and progression",
    summary:
      "Durable player state for contracts, economy, unlocks, and settings.",
    problem:
      "Cross-system progress is easy to corrupt when each feature serializes or resets its own state.",
    solution:
      "Persistent managers and repositories coordinate profile data, wallet state, progression, settings, and gameplay milestones.",
    result:
      "Product systems share one recoverable player state with focused smoke and integration coverage.",
    technologies: ["Unity", "C#", "Repositories", "Persistence tests"],
  },
  {
    slug: "traffic-and-ambient-life",
    category: "World simulation",
    title: "Traffic and ambient life",
    summary:
      "Road-aware vehicles, pedestrians, environment actors, and demolition reactions.",
    problem:
      "Generated cities feel disconnected when ambient actors ignore roads, hazards, and active building destruction.",
    solution:
      "Traffic and environment managers consume settlement topology and destruction events to control routes, spawning, and hazard reactions.",
    result:
      "The settlement reads as a functioning place and its ambient life can respond to the player's demolition activity.",
    technologies: ["Unity", "C#", "Road topology", "Event-driven AI"],
  },
  {
    slug: "ui-navigation-contracts",
    category: "Application flow",
    title: "UI navigation contracts",
    summary:
      "Explicit routes between area map, contract selection, loadout, gameplay, and product screens.",
    problem:
      "Direct scene and panel references make it difficult to preserve required setup steps as the number of screens grows.",
    solution:
      "Navigation services, catalogs, presenters, and popup contracts route actions through named destinations and shared lifecycle rules.",
    result:
      "Gameplay setup remains ordered and individual screens can be generated, tested, or replaced without rewriting every caller.",
    technologies: ["Unity", "C#", "Presenters", "Navigation services"],
  },
  {
    slug: "automated-bootstrap-checks",
    category: "Runtime architecture",
    title: "Automated bootstrap checks",
    summary:
      "Deterministic startup and registration for reusable game and product services.",
    problem:
      "Runtime-created managers can fail silently when initialization order, service registration, or fallback dependencies change.",
    solution:
      "A system automation bootstrap creates services in an explicit order while validators and status surfaces report missing registrations.",
    result:
      "Startup behavior is inspectable and reusable systems can fail with actionable evidence instead of null-reference chains.",
    technologies: ["Unity", "C#", "Service locator", "Runtime initialization"],
  },
];

export const gameSystems: GameSystemEntry[] = gameSystemSeeds.map((system) => ({
  ...system,
  detail: gameSystemPublicDetail(system),
}));

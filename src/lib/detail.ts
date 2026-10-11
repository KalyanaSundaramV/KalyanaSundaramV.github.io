import type {
  GameSystemEntry,
  LearningEntry,
  Project,
  ProjectMedia,
  PublicDetail,
  TimelineItem,
  ToolEntry,
  ToolGroup,
  ToolUtility,
} from "@/lib/types";

export type ArtworkVariant =
  | "blueprint"
  | "pipeline"
  | "inspector"
  | "settlement"
  | "runtime"
  | "learning";

export type ToolDetail = {
  slug: string;
  category: string;
  title: string;
  status: string;
  summary: string;
  problem: string;
  solution: string;
  result: string;
  technologies: string[];
  detail: PublicDetail;
};

export type LearningDetail = {
  slug: string;
  category: string;
  title: string;
  status: string;
  startDate: string;
  lastUpdated: string;
  motivation: string;
  body: string;
  topics: string[];
  relatedProject: string;
  nextMilestone: string;
  evidence: string | null;
  detail: PublicDetail;
};

export type ActiveDetail =
  | { kind: "project"; item: Project }
  | { kind: "tool"; item: ToolDetail }
  | { kind: "learning"; item: LearningDetail };

export type DetailSection = {
  label: string;
  title: string;
  body: string;
};

export type DetailFact = {
  label: string;
  value: string;
};

export type DetailEvidence = {
  label: string;
  title: string;
  body: string;
};

export type DetailViewModel = {
  kind: ActiveDetail["kind"];
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  sections: DetailSection[];
  facts: DetailFact[];
  tags: string[];
  detail: PublicDetail;
  /** Null until verified public evidence exists; the evidence card is then hidden. */
  evidence: DetailEvidence | null;
  artwork: ArtworkVariant;
};

export type QuickLookViewModel = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  highlights: string[];
  artwork: ArtworkVariant;
};

function artworkFor(text: string): ArtworkVariant {
  const value = text.toLowerCase();
  if (/learning|cocos|unreal|development log/.test(value)) return "learning";
  if (/settlement|world|road|environment|traffic/.test(value)) {
    return "settlement";
  }
  if (/building|fracture|destruction|structural/.test(value)) {
    return "blueprint";
  }
  if (/ui|popup|catalog|validator|inspector/.test(value)) return "inspector";
  if (/runtime|event|bootstrap|navigation|save|economy/.test(value)) {
    return "runtime";
  }
  return "pipeline";
}

export function suiteDetail(tool: ToolEntry): ToolDetail {
  return {
    slug: tool.slug,
    category: tool.category,
    title: tool.title,
    status: "Editor suite",
    summary: tool.result,
    problem: tool.problem,
    solution: tool.solution,
    result: tool.result,
    technologies: tool.technologies,
    detail: tool.detail,
  };
}

export function utilityDetail(tool: ToolUtility, group: ToolGroup): ToolDetail {
  return {
    slug: tool.slug,
    category: group.title,
    title: tool.title,
    status: tool.status,
    summary: tool.description,
    problem: tool.problem,
    solution: tool.solution,
    result: tool.result,
    technologies: tool.technologies,
    detail: tool.detail,
  };
}

export function systemDetail(system: GameSystemEntry): ToolDetail {
  return {
    ...system,
    status: "Game system",
  };
}

export function learningDetail(entry: LearningEntry): LearningDetail {
  return {
    slug: entry.slug,
    category: "Learning note",
    title: entry.title,
    status: entry.status,
    startDate: entry.startDate,
    lastUpdated: entry.lastUpdated,
    motivation: entry.motivation,
    body: entry.body,
    topics: entry.topics,
    relatedProject: entry.relatedProject,
    nextMilestone: entry.nextMilestone,
    evidence: entry.evidence?.trim() || null,
    detail: entry.detail,
  };
}

export function timelineLearningDetail(
  item: TimelineItem,
  index: number,
): LearningDetail {
  return {
    slug: `ludo-development-${index + 1}`,
    category: "Ludo Demolition development log",
    title: item.title,
    status: item.date,
    startDate: "Current development cycle",
    lastUpdated: item.date,
    motivation:
      "Turn active development work into verifiable portfolio evidence without presenting unfinished systems as final.",
    body: item.description,
    topics: ["Ludo Demolition", "Development evidence", "Technical case study"],
    relatedProject: "Ludo Demolition",
    nextMilestone: item.description,
    evidence: null,
    detail: {
      scope:
        "Documents one development milestone as a public technical note tied to the active Ludo Demolition project.",
      constraints: [
        "The note must separate implemented evidence from planned work and avoid presenting a prototype milestone as shipped product history.",
        "Private source, production assets, credentials, and unreleased commercial details remain outside the portfolio.",
      ],
      engineeringHighlights: [
        item.description,
        "The milestone is framed around the decision, observable behavior, and next proof point rather than an internal source-code tour.",
      ],
      proofPoints: [
        `Development marker: ${item.date}.`,
        "Part of the active Ludo Demolition prototype; scope is stated at its currently verified level.",
      ],
      disclosure:
        "This is an active development record. Dates and outcomes are shown only at the level currently verified in the portfolio data.",
    },
  };
}

export function createDetailViewModel(active: ActiveDetail): DetailViewModel {
  if (active.kind === "project") {
    const project = active.item;
    const proofPoints = project.metrics.map(
      (metric) => `${metric.label}: ${metric.value}`,
    );
    return {
      kind: active.kind,
      slug: project.slug,
      eyebrow: `${project.type} / ${project.status}`,
      title: project.name,
      summary: project.longSummary,
      sections: project.caseStudySections.map((section) => ({
        label: section.kicker,
        title: section.title,
        body: section.body,
      })),
      facts: [
        { label: "Role", value: project.role },
        { label: "Engine", value: project.engine },
        { label: "Platform", value: project.platform },
      ],
      tags: project.technologies,
      detail: {
        scope: project.role,
        constraints: project.notice ? [project.notice] : [project.longSummary],
        engineeringHighlights: project.caseStudySections
          .slice(0, 3)
          .map((section) => section.body),
        proofPoints:
          proofPoints.length > 0
            ? proofPoints
            : project.toolCategories.slice(0, 3),
        disclosure: project.notice,
      },
      evidence: projectEvidence(project),
      artwork: artworkFor(`${project.type} ${project.name}`),
    };
  }

  if (active.kind === "tool") {
    const tool = active.item;
    return {
      kind: active.kind,
      slug: tool.slug,
      eyebrow: `${tool.category} / ${tool.status}`,
      title: tool.title,
      summary: tool.summary,
      sections: [
        { label: "Challenge", title: "What it solves", body: tool.problem },
        { label: "Approach", title: "How it works", body: tool.solution },
        { label: "Outcome", title: "What it changes", body: tool.result },
      ],
      facts: [
        { label: "Scope", value: tool.detail.scope },
        { label: "Status", value: tool.status },
        { label: "Area", value: tool.category },
      ],
      tags: tool.technologies,
      detail: tool.detail,
      evidence: null,
      artwork: artworkFor(`${tool.category} ${tool.title}`),
    };
  }

  const learning = active.item;
  return {
    kind: active.kind,
    slug: learning.slug,
    eyebrow: `${learning.category} / ${learning.status}`,
    title: learning.title,
    summary: learning.body,
    sections: [
      {
        label: "Motivation",
        title: "Why this matters",
        body: learning.motivation,
      },
      {
        label: "Current direction",
        title: "What I am exploring",
        body: learning.body,
      },
      {
        label: "Next milestone",
        title: "What comes next",
        body: learning.nextMilestone,
      },
    ],
    facts: [
      { label: "Started", value: learning.startDate },
      { label: "Updated", value: learning.lastUpdated },
      { label: "Related work", value: learning.relatedProject },
    ],
    tags: learning.topics,
    detail: learning.detail,
    evidence: learning.evidence
      ? { label: "Evidence", title: "Learning proof", body: learning.evidence }
      : null,
    artwork: "learning",
  };
}

function projectEvidence(project: Project): DetailEvidence | null {
  const image = project.media.find(
    (item): item is Extract<ProjectMedia, { type: "image" }> =>
      item.type === "image",
  );
  return image
    ? { label: "Approved media", title: "Project evidence", body: image.alt }
    : null;
}

export function createQuickLookViewModel(
  active: ActiveDetail,
): QuickLookViewModel {
  const model = createDetailViewModel(active);
  const highlights =
    active.kind === "project"
      ? [
          active.item.role,
          `${active.item.engine} / ${active.item.platform}`,
          active.item.status,
        ]
      : active.kind === "tool"
        ? [
            active.item.status,
            active.item.category,
            active.item.detail.proofPoints[0],
          ]
        : [
            `Status: ${active.item.status}`,
            `Related: ${active.item.relatedProject}`,
            `Next: ${active.item.nextMilestone}`,
          ];
  return {
    id: `quick-look-${model.kind}-${model.slug}`,
    title: model.title,
    eyebrow: model.eyebrow,
    summary: model.summary,
    highlights,
    artwork: model.artwork,
  };
}

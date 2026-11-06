import type { ResumeContent, TimelineItem } from "@/lib/types";

export const resume: ResumeContent = {
  summary:
    "Game and tools engineer with experience leading rapid prototypes and building gameplay systems, Unity production pipelines, and native Windows and Android products.",
  skills: [
    "Unity",
    "C#",
    "Gameplay programming",
    "Game development",
    "Developer tools",
    "Procedural generation",
    ".NET and WinUI 3",
    "Cocos Creator",
    "TypeScript",
    "Android and Java",
    "Testing and automation",
  ],
  experience: [
    {
      date: "March 2026-Present",
      title: "Independent Game & Tools Engineer",
      description:
        "Building gameplay prototypes, Unity content pipelines, and local-first Windows and Android tools.",
    },
    {
      date: "November 2024-March 2026",
      title: "Gameplay Engineer - Qila Games",
      description:
        "Contributed high-level gameplay and product systems for Ludo Hero in a four-developer team working with artists.",
    },
    {
      date: "September 2021-May 2023",
      title: "Prototype Team Tech Lead / SDE2 - Bombay Play",
      description:
        "Led engineering delivery across 12 rapid prototypes, including Word Wall and seven Match10 variations.",
    },
    {
      date: "2016-2021",
      title: "Founder / Independent Developer - Ameya Game Studio",
      description:
        "Ran a closed, part-time independent studio and published King Cube for Android.",
    },
    {
      date: "March 2018-April 2019",
      title: "Game Developer - URG Infotech",
      description:
        "Independently developed Android game prototypes and recreations of established mechanics.",
    },
  ],
  education: [
    {
      date: "Degree",
      title: "Bachelor of Engineering in Computer Science",
      description:
        "Meenakshi Ramaswamy Engineering College, affiliated with Anna University.",
    },
  ],
  achievements: [
    {
      date: "Current work",
      title: "ProjectPulse, AssetForge / PackTriage, and Ludo Demolition",
      description:
        "Evidence-backed projects covering local engineering workflows, 427-pack Unity asset triage, and mobile-first procedural demolition systems.",
    },
  ],
};

export const ludoTimeline: TimelineItem[] = [
  {
    date: "Current build",
    title: "Contract-driven demolition loop",
    description:
      "Tool selection, dice and tactical phases, destructible parts, objectives, rewards, economy, and progression share a testable Unity runtime.",
  },
  {
    date: "World systems",
    title: "Procedural settlements with validation",
    description:
      "Planner-driven layouts preserve road access, facade orientation, deterministic seeds, and regression-friendly checks.",
  },
  {
    date: "Engineering boundary",
    title: "Mobile-first performance and readable architecture",
    description:
      "Physics, pooling, mesh generation, configuration, and automated checks remain visible as the prototype moves toward device validation.",
  },
];

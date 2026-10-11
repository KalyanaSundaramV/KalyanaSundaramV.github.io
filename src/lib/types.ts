export type NavigationRoute = {
  href: string;
  label: string;
};

export type SocialLink = {
  label: string;
  href: string | null;
  placeholder: string;
};

export type ContactMethod = {
  label: string;
  value: string;
  href: string | null;
};

export type ProfileValue = {
  label: string;
  title: string;
  description: string;
};

export type Profile = {
  name: string;
  role: string;
  location: string;
  email: string | null;
  resumePdfHref: string | null;
  extendedResumePdfHref: string | null;
  summary: string;
  about: string;
  currentStatus: Array<{
    label: string;
    value: string;
  }>;
  socialLinks: SocialLink[];
  contactMethods: ContactMethod[];
  values: ProfileValue[];
};

export type ProjectStatus =
  | "Completed"
  | "Work in progress"
  | "Experiment"
  | "Team project"
  | "Placeholder";

export type ProjectMetric = {
  label: string;
  value: string;
};

export type ProjectLink = {
  label: string;
  href: string | null;
  placeholder: string;
};

export type ProjectCaseStudySection = {
  kicker: string;
  title: string;
  body: string;
};

export type ProjectMedia =
  | {
      type: "placeholder";
      label: string;
      placeholder: string;
    }
  | {
      type: "image";
      label: string;
      src: string;
      alt: string;
    };

export type ProjectVideo = {
  title: string;
  href: string | null;
  placeholder: string;
};

export type Project = {
  slug: string;
  name: string;
  summary: string;
  longSummary: string;
  type: "Games" | "Tools" | "Experiments";
  engine: "Unity" | "Cocos" | "Unreal" | "Android" | ".NET" | "Mixed";
  status: ProjectStatus;
  platform: string;
  role: string;
  featured: boolean;
  isPlaceholder: boolean;
  tags: string[];
  technologies: string[];
  coverLabel: string;
  coverMark: string;
  coverAlt: string;
  caseStudyHref: string | null;
  placeholderAction: string;
  metrics: ProjectMetric[];
  toolCategories: string[];
  links: ProjectLink[];
  caseStudySections: ProjectCaseStudySection[];
  media: ProjectMedia[];
  video: ProjectVideo;
  notice?: string;
};

export type PublicDetail = {
  scope: string;
  constraints: string[];
  engineeringHighlights: string[];
  proofPoints: string[];
  disclosure?: string;
};

export type ToolEntry = {
  slug: string;
  category: string;
  title: string;
  problem: string;
  solution: string;
  technologies: string[];
  result: string;
  detail: PublicDetail;
};

export type ToolUtility = {
  slug: string;
  title: string;
  description: string;
  status: "Production" | "Automatic" | "Debug" | "Partial" | "Legacy";
  problem: string;
  solution: string;
  result: string;
  technologies: string[];
  detail: PublicDetail;
};

export type ToolGroup = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  tools: ToolUtility[];
};

export type GameSystemEntry = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  problem: string;
  solution: string;
  result: string;
  technologies: string[];
  detail: PublicDetail;
};

export type LearningStatus =
  "Exploring" | "Practising" | "Building" | "Comfortable" | "Paused";

export type LearningEntry = {
  slug: string;
  title: string;
  status: LearningStatus;
  motivation: string;
  startDate: string;
  lastUpdated: string;
  nextMilestone: string;
  relatedProject: string;
  excerpt: string;
  body: string;
  topics: string[];
  /** Public description of verified evidence; omit until evidence exists. */
  evidence?: string;
  detail: PublicDetail;
};

export type TimelineItem = {
  date: string;
  title: string;
  description: string;
};

export type ResumeContent = {
  summary: string;
  skills: string[];
  experience: TimelineItem[];
  education: TimelineItem[];
  achievements: TimelineItem[];
};

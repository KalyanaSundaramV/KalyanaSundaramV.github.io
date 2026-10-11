import type { CSSProperties } from "react";
import {
  BookOpen,
  Boxes,
  Braces,
  GitBranch,
  Map,
  SlidersHorizontal,
} from "lucide-react";
import { projectArtwork, variantArtwork } from "@/content/ownerAssets";
import type { ArtworkVariant } from "@/lib/detail";
import type { Project } from "@/lib/types";

const projectArtColors: Record<string, string> = {
  "ludo-demolition": "#d96a3a",
  "cube-kingdom": "#8fae60",
  "ludo-hero": "#d7a64b",
  "project-pulse": "#5c8fa0",
  "wallpaper-workbench": "#7699b2",
  "civitai-asset-manager": "#6c708f",
  "money-planner": "#6d9b77",
};

const variantIcons = {
  blueprint: Boxes,
  pipeline: GitBranch,
  inspector: SlidersHorizontal,
  settlement: Map,
  runtime: Braces,
  learning: BookOpen,
};

export function ProjectArtwork({ project }: { project: Project }) {
  const artwork = projectArtwork(project.slug);
  return (
    <div
      className="project-artwork"
      style={
        {
          "--project-color": projectArtColors[project.slug] ?? "#8c9293",
          "--art-position": artwork.position ?? "center",
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <img
        className="owner-art-raster"
        src={artwork.src}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span className="project-art-grid" />
      <span className="project-art-block block-a" />
      <span className="project-art-block block-b" />
      <span className="project-art-block block-c" />
      <strong>{project.coverMark}</strong>
      <small>{project.coverLabel}</small>
    </div>
  );
}

export function PortfolioArtwork({
  variant,
  label,
  compact = false,
}: {
  variant: ArtworkVariant;
  label: string;
  compact?: boolean;
}) {
  const Icon = variantIcons[variant];
  const artwork = variantArtwork(variant);
  return (
    <div
      className="portfolio-artwork"
      data-variant={variant}
      data-compact={compact}
      style={
        {
          "--art-position": artwork.position ?? "center",
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <img
        className="owner-art-raster"
        src={artwork.src}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span className="portfolio-art-grid" />
      <span className="portfolio-art-line line-a" />
      <span className="portfolio-art-line line-b" />
      <span className="portfolio-art-line line-c" />
      <span className="portfolio-art-node node-a" />
      <span className="portfolio-art-node node-b" />
      <span className="portfolio-art-node node-c" />
      <Icon />
      <small>{label}</small>
    </div>
  );
}

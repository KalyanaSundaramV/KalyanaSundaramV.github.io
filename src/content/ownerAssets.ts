import type { ArtworkVariant } from "@/lib/detail";

export type OwnerArtwork = {
  src: string;
  position?: string;
};

export type OwnerMeshAssembly = {
  name: string;
  files: string[];
};

const portfolioSystemArt: OwnerArtwork = {
  src: "/og-art.webp",
  position: "72% 48%",
};

export const ownerAssets = {
  artwork: {
    background: portfolioSystemArt,
    projects: {
      "ludo-demolition": { src: "/og-art.webp", position: "78% 44%" },
      "cube-kingdom": { src: "/og-art.webp", position: "64% 34%" },
      "ludo-hero": { src: "/og-art.webp", position: "90% 76%" },
      "project-pulse": { src: "/og-art.webp", position: "50% 34%" },
      "wallpaper-workbench": { src: "/og-art.webp", position: "44% 54%" },
      "civitai-asset-manager": { src: "/og-art.webp", position: "58% 68%" },
      "money-planner": { src: "/og-art.webp", position: "32% 26%" },
    } satisfies Record<string, OwnerArtwork>,
    variants: {
      blueprint: { src: "/og-art.webp", position: "68% 42%" },
      pipeline: { src: "/og-art.webp", position: "56% 54%" },
      inspector: { src: "/og-art.webp", position: "88% 76%" },
      settlement: { src: "/og-art.webp", position: "73% 36%" },
      runtime: { src: "/og-art.webp", position: "84% 50%" },
      learning: { src: "/og-art.webp", position: "48% 38%" },
    } satisfies Record<ArtworkVariant, OwnerArtwork>,
  },
  meshes: {
    building: null as OwnerMeshAssembly | null,
    environment: null as OwnerMeshAssembly | null,
  },
};

export function projectArtwork(slug: string): OwnerArtwork {
  return (
    (ownerAssets.artwork.projects as Record<string, OwnerArtwork>)[slug] ??
    portfolioSystemArt
  );
}

export function variantArtwork(variant: ArtworkVariant): OwnerArtwork {
  return ownerAssets.artwork.variants[variant] ?? portfolioSystemArt;
}

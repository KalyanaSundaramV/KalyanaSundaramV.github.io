import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import manifest from "@/content/glassManifest.json";

export type GlassAssetName = keyof typeof manifest.components;

type LayeredGlassAssetProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  asset: GlassAssetName;
  children: ReactNode;
  contentClassName?: string;
};

// The panel surface, rim and shadow are drawn in CSS (.layered-glass). The
// pack's stretched PNG layers left stray arcs and offset frames on panels
// whose aspect ratio differed from the source art, so only the manifest's
// radius and proportions are used now.
export function LayeredGlassAsset({
  asset,
  children,
  className = "",
  contentClassName = "",
  style,
  ...props
}: LayeredGlassAssetProps) {
  const metadata = manifest.components[asset];
  const componentStyle = {
    "--glass-native-aspect": `${metadata.logicalSize.width} / ${metadata.logicalSize.height}`,
    "--glass-radius": `${metadata.radius}px`,
    ...style,
  } as CSSProperties;

  return (
    <div
      {...props}
      className={`layered-glass ${className}`.trim()}
      data-glass-asset={asset}
      style={componentStyle}
    >
      <div className={`glass-asset-content ${contentClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}

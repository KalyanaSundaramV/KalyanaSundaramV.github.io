export const mobileVisualPresets = {
  low: { dpr: 0.85, shadowMap: 512, antialias: false },
  balanced: { dpr: 1.1, shadowMap: 1024, antialias: true },
  high: { dpr: 1.25, shadowMap: 2048, antialias: true },
} as const;

export type MobileVisualQuality = keyof typeof mobileVisualPresets;

export function isMobileVisualQuality(
  value: unknown,
): value is MobileVisualQuality {
  return value === "low" || value === "balanced" || value === "high";
}

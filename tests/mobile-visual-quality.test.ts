import { describe, expect, test } from "vitest";
import {
  isMobileVisualQuality,
  mobileVisualPresets,
  type MobileVisualQuality,
} from "@/lib/mobileVisualQuality";

describe("mobile visual quality", () => {
  test("accepts only the defined preset values", () => {
    expect(isMobileVisualQuality("low")).toBe(true);
    expect(isMobileVisualQuality("balanced")).toBe(true);
    expect(isMobileVisualQuality("high")).toBe(true);
    expect(isMobileVisualQuality("ultra")).toBe(false);
    expect(isMobileVisualQuality(undefined)).toBe(false);
  });

  test("preserves the supported preset map", () => {
    const keys = Object.keys(mobileVisualPresets) as MobileVisualQuality[];
    expect(keys).toEqual(["low", "balanced", "high"]);
    expect(mobileVisualPresets.low.shadowMap).toBe(512);
    expect(mobileVisualPresets.balanced.antialias).toBe(true);
    expect(mobileVisualPresets.high.dpr).toBe(1.25);
  });
});

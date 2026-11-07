import { describe, expect, it } from "vitest";
import { isMobileVisualQuality } from "@/components/DestructionLab";

describe("mobile visual quality guard", () => {
  it("accepts the supported preset names and rejects unexpected values", () => {
    expect(isMobileVisualQuality("low")).toBe(true);
    expect(isMobileVisualQuality("balanced")).toBe(true);
    expect(isMobileVisualQuality("high")).toBe(true);
    expect(isMobileVisualQuality("ultra")).toBe(false);
    expect(isMobileVisualQuality("" )).toBe(false);
  });
});

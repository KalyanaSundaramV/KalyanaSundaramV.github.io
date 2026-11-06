import { describe, expect, test } from "vitest";
import { weatherSettings } from "@/components/lab/WeatherLayer";

describe("weatherSettings", () => {
  test("returns the exact values for each weather mode", () => {
    expect(weatherSettings(null, false)).toEqual({
      fog: null,
      ambientIntensity: 1,
      keyLight: null,
      rainDrops: 0,
    });

    expect(weatherSettings("fog", false)).toEqual({
      fog: { color: "#c9d1d8", near: 18, far: 70 },
      ambientIntensity: 0.85,
      keyLight: null,
      rainDrops: 0,
    });

    expect(weatherSettings("night", false)).toEqual({
      fog: { color: "#0b1020", near: 30, far: 110 },
      ambientIntensity: 0.35,
      keyLight: { color: "#9fb4ff", intensity: 0.6 },
      rainDrops: 0,
    });

    expect(weatherSettings("rain", false)).toEqual({
      fog: { color: "#8f9aa5", near: 24, far: 90 },
      ambientIntensity: 0.7,
      keyLight: null,
      rainDrops: 1200,
    });
  });

  test("rain respects reduced motion without losing the fog and dimming", () => {
    expect(weatherSettings("rain", true)).toEqual({
      fog: { color: "#8f9aa5", near: 24, far: 90 },
      ambientIntensity: 0.7,
      keyLight: null,
      rainDrops: 0,
    });
  });
});

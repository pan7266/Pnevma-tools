import { describe, expect, it } from "vitest";
import { DEFAULT_OPTICAL_PROFILE } from "@/lib/data/kerf";
import {
  beamDiametersInMaterial,
  calculateKerfAdvisor,
  confocalParameterMm,
  rayleighRangeMm,
  waistRadiusMmFromSpotDiameter,
} from "@/lib/calculators/kerf";

describe("kerf advisor", () => {
  it("implements Gaussian beam formulas for a known spot", () => {
    const waist = waistRadiusMmFromSpotDiameter(0.12);
    const zR = rayleighRangeMm(waist);
    expect(waist).toBeCloseTo(0.06, 8);
    expect(zR).toBeCloseTo(1.067, 3);
    expect(confocalParameterMm(zR)).toBeCloseTo(2.134, 3);
  });

  it("recommends the specified 6 mm cast PMMA focus rule", () => {
    const result = calculateKerfAdvisor({
      opticalProfile: DEFAULT_OPTICAL_PROFILE,
      materialId: "pmma",
      family: "cast_acrylic",
      subtype: "cast_acrylic",
      thicknessMm: 6,
      operation: "cut_through",
      qualityGoal: "polished_acrylic_edge",
      extraction: true,
      airAssist: "medium",
    });
    expect(result.blocked).toBe(false);
    expect(result.recommendedFocusDepthMm).toBeCloseTo(2, 1);
    expect(result.placementLabelKey).toBe("placementUpperThird");
    expect(result.topDiameterMm).toBeGreaterThan(0);
  });

  it("blocks unknown plastics", () => {
    const result = calculateKerfAdvisor({
      opticalProfile: DEFAULT_OPTICAL_PROFILE,
      materialId: "unknown-plastic",
      family: "unknown_plastic",
      subtype: "unknown_plastic",
      thicknessMm: 3,
      operation: "cut_through",
      qualityGoal: "fast_production",
    });
    expect(result.blocked).toBe(true);
    expect(result.lightBurnNotes).toContain("Material identity is unknown");
  });

  it("calculates beam diameters at top, middle, and bottom", () => {
    const beam = beamDiametersInMaterial(6, 2, 0.12);
    expect(beam.top).toBeGreaterThan(beam.middle);
    expect(beam.bottom).toBeGreaterThan(0);
    expect(beam.confocal).toBeCloseTo(2 * beam.zR, 8);
  });
});

import { describe, expect, it } from "vitest";
import { calculateSpot } from "../lib/calculators/spot";
import { spotDefaultValues } from "../lib/data/defaults";
import type { SpotInputs } from "../types";

describe("calculateSpot", () => {
  it("preserves the old default CO2 spot calculation", () => {
    const result = calculateSpot({ ...(spotDefaultValues as unknown as SpotInputs), sourceId: "reci-w4" });

    expect(result.spot).toBeCloseTo(0.10757787395593282, 12);
    expect(result.deliveredWatt).toBeCloseTo(58.74807895944, 10);
    expect(result.selectedWatt).toBeCloseTo(65, 12);
    expect(result.clipped).toBe(false);
    expect(result.effectiveBeam).toBeCloseTo(8, 12);
  });

  it("uses the fixed three-mirror path for a K40-style PVD scenario", () => {
    const result = calculateSpot({
      ...(spotDefaultValues as unknown as SpotInputs),
      sourceId: "generic-k40-40",
      powerPercent: 50,
      lensDiameter: 12,
      focalLength: 38.1,
      finish: "PVD",
      mirrorCount: 2,
      imperfectAlignment: false,
    });

    expect(result.spot).toBeCloseTo(0.20188689466900933, 12);
    expect(result.deliveredWatt).toBeCloseTo(18.234896303200003, 10);
    expect(result.mirrorCount).toBe(3);
    expect(result.selectedWatt).toBeCloseTo(20, 12);
    expect(result.currentBestMa).toBe(18);
  });

  it("supports manual source inputs when no preset is selected", () => {
    const result = calculateSpot({
      ...(spotDefaultValues as unknown as SpotInputs),
      sourceId: "",
      manualRatedWatt: 100,
      manualSourceBeamMm: 8,
      manualM2: 1.2,
      powerPercent: 50,
    });

    expect(result.source.id).toBe("manual");
    expect(result.sourceBeam).toBeCloseTo(8, 12);
    expect(result.selectedWatt).toBeCloseTo(50, 12);
    expect(result.spot).toBeGreaterThan(0);
  });

  it("applies beam combiner transmission loss", () => {
    const baseline = calculateSpot({ ...(spotDefaultValues as unknown as SpotInputs), sourceId: "reci-w4" });
    const withCombiner = calculateSpot({
      ...(spotDefaultValues as unknown as SpotInputs),
      sourceId: "reci-w4",
      beamCombinerPosition: "beforeFirstMirror",
      beamCombinerTransmission: 90,
      beamCombinerDiameter: 20,
    });

    expect(withCombiner.deliveredWatt).toBeLessThan(baseline.deliveredWatt);
    expect(withCombiner.beamCombinerLossWatt).toBeGreaterThan(0);
    expect(withCombiner.assumptions).toContain("assumptionCombinerEditable");
  });
});

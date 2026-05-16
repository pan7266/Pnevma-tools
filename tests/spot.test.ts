import { describe, expect, it } from "vitest";
import { calculateSpot } from "../lib/calculators/spot";
import { spotDefaultValues } from "../lib/data/defaults";
import type { SpotInputs } from "../types";

describe("calculateSpot", () => {
  it("preserves the old default CO2 spot calculation", () => {
    const result = calculateSpot(spotDefaultValues as unknown as SpotInputs);

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
});

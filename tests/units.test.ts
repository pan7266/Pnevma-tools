import { describe, expect, it } from "vitest";
import { displayLengthValue, formatLength, inchesToMm, mmToInches, parseLengthValue } from "../lib/units/convert";
import { validateSpotInputs } from "../lib/validation/spot-validation";
import { spotDefaultValues } from "../lib/data/defaults";
import type { SpotInputs } from "../types";

describe("unit conversion", () => {
  it("converts metric and imperial values deterministically", () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 12);
    expect(inchesToMm(2)).toBeCloseTo(50.8, 12);
    expect(formatLength(25.4, "imperial", 2)).toBe("1 in");
  });

  it("keeps displayed length conversion reversible", () => {
    const displayed = displayLengthValue(2.032, "imperial", 6);
    expect(displayed).toBe("0.08");
    expect(Number(parseLengthValue(displayed, "imperial"))).toBeCloseTo(2.032, 12);
  });
});

describe("validation", () => {
  it("coerces numeric strings and rejects impossible values", () => {
    const valid = validateSpotInputs({
      ...(spotDefaultValues as unknown as SpotInputs),
      lensDiameter: "20",
      focalLength: "50.8",
    });
    expect(valid.ok).toBe(true);
    expect(valid.value?.lensDiameter).toBe(20);

    const invalid = validateSpotInputs({
      ...(spotDefaultValues as unknown as SpotInputs),
      lensDiameter: "0",
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join(" ")).toContain("lensDiameter");
  });
});

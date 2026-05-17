import { describe, expect, it } from "vitest";
import { calculateAxis } from "../lib/calculators/axis";
import { axisDefaultValues } from "../lib/data/defaults";
import { validateAxisInputs } from "../lib/validation/axis-validation";
import type { AxisInputs } from "../types";

describe("calculateAxis", () => {
  it("preserves the old default horizontal/Y interval calculation", () => {
    const result = calculateAxis(axisDefaultValues);

    expect(result.activeAxisKey).toBe("y");
    expect(result.calc.travelPerRev).toBeCloseTo(40.64, 12);
    expect(result.calc.stepsPerMm).toBeCloseTo(157.48031496062993, 12);
    expect(result.calc.mmPerMicrostep).toBeCloseTo(0.00635, 12);
    expect(result.interval?.intervalMicrosteps).toBeCloseTo(9.448818897637794, 12);
    expect(result.interval?.nearestCleanInterval).toBeCloseTo(0.05715, 12);
    expect(result.interval?.clean).toBe(false);
  });

  it("preserves controller-only interval behavior", () => {
    const input: AxisInputs = {
      ...axisDefaultValues,
      scanMode: "vertical",
      lineInterval: 0.1,
      axes: {
        ...axisDefaultValues.axes,
        x: {
          ...axisDefaultValues.axes.x,
          driveType: "controllerOnly",
          controllerStepsPerMm: 100,
        },
      },
    };

    const result = calculateAxis(input);

    expect(result.activeAxisKey).toBe("x");
    expect(result.calc.controllerOnly).toBe(true);
    expect(result.calc.mmPerMicrostep).toBeCloseTo(0.01, 12);
    expect(result.interval?.intervalMicrosteps).toBeCloseTo(10, 12);
    expect(result.interval?.clean).toBe(true);
  });

  it("derives line interval from DPI when only DPI is entered", () => {
    const validated = validateAxisInputs({
      ...axisDefaultValues,
      lineInterval: "",
      dpi: "508",
    });

    expect(validated.ok).toBe(true);
    expect(validated.value?.lineInterval).toBeCloseTo(0.05, 12);

    const result = calculateAxis(validated.value as AxisInputs);
    expect(result.interval?.intervalMicrosteps).toBeCloseTo(7.874015748031496, 12);
  });
});

import { axisDefaultValues } from "@/lib/data/defaults";
import type { AxisInputs, AxisKey, AxisMechanics, NumericInput } from "@/types";
import type { ValidationResult } from "@/lib/validation/spot-validation";

function coerceNumber(value: NumericInput, field: string, errors: string[], allowBlank = false): NumericInput {
  if (allowBlank && (value === "" || value === null || value === undefined)) return null;
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a finite number.`);
    return null;
  }
  return parsed;
}

function isPositive(value: NumericInput): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateAxisMechanics(axisKey: AxisKey, axis: AxisMechanics, errors: string[]): AxisMechanics {
  const next = { ...axis };
  next.motorAngle = coerceNumber(next.motorAngle, `${axisKey}.motorAngle`, errors);
  next.microstepping = coerceNumber(next.microstepping, `${axisKey}.microstepping`, errors);
  next.beltPitch = coerceNumber(next.beltPitch, `${axisKey}.beltPitch`, errors);
  next.pulleyTeeth = coerceNumber(next.pulleyTeeth, `${axisKey}.pulleyTeeth`, errors);
  next.screwPitch = coerceNumber(next.screwPitch, `${axisKey}.screwPitch`, errors);
  next.threadStarts = coerceNumber(next.threadStarts, `${axisKey}.threadStarts`, errors);
  next.directTravelPerRev = coerceNumber(next.directTravelPerRev, `${axisKey}.directTravelPerRev`, errors);
  next.controllerStepsPerMm = coerceNumber(next.controllerStepsPerMm, `${axisKey}.controllerStepsPerMm`, errors, true);
  next.secondMotorAngle = coerceNumber(next.secondMotorAngle, `${axisKey}.secondMotorAngle`, errors);
  next.secondPulleyTeeth = coerceNumber(next.secondPulleyTeeth, `${axisKey}.secondPulleyTeeth`, errors);
  next.secondMicrostepping = coerceNumber(next.secondMicrostepping, `${axisKey}.secondMicrostepping`, errors);

  if (next.driveType === "controllerOnly" && !isPositive(next.controllerStepsPerMm)) {
    errors.push(`${axisKey}.controllerStepsPerMm must be greater than zero for controller-only mode.`);
  }
  return next;
}

export function validateAxisInputs(input: Partial<AxisInputs>): ValidationResult<AxisInputs> {
  const errors: string[] = [];
  const defaults = axisDefaultValues;
  const value: AxisInputs = {
    ...defaults,
    ...input,
    axes: {
      x: { ...defaults.axes.x, ...input.axes?.x },
      y: { ...defaults.axes.y, ...input.axes?.y },
    },
  };

  value.lineInterval = coerceNumber(value.lineInterval, "lineInterval", errors);
  value.dpi = coerceNumber(value.dpi, "dpi", errors, true);
  value.spotDiameter = coerceNumber(value.spotDiameter, "spotDiameter", errors, true);
  value.axes.x = validateAxisMechanics("x", value.axes.x, errors);
  value.axes.y = validateAxisMechanics("y", value.axes.y, errors);

  const dpiForSync = value.dpi;
  const lineForSync = value.lineInterval;
  if (!isPositive(lineForSync) && isPositive(dpiForSync)) {
    value.lineInterval = 25.4 / dpiForSync;
  }
  const syncedLine = value.lineInterval;
  const syncedDpi = value.dpi;
  if (isPositive(syncedLine) && !isPositive(syncedDpi)) {
    value.dpi = 25.4 / syncedLine;
  }

  if (value.scanMode !== "horizontal" && value.scanMode !== "vertical") errors.push("scanMode must be horizontal or vertical.");
  if (!isPositive(value.lineInterval)) errors.push("lineInterval must be greater than zero.");
  if (value.dpi !== null && value.dpi !== "" && value.dpi !== undefined && !isPositive(value.dpi)) {
    errors.push("dpi must be greater than zero when provided.");
  }
  if (value.spotDiameter !== null && value.spotDiameter !== "" && value.spotDiameter !== undefined && !isPositive(value.spotDiameter)) {
    errors.push("spotDiameter must be greater than zero when provided.");
  }

  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

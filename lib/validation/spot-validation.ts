import { spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { LENS_SHAPES } from "@/lib/data/lenses";
import { SOURCE_LIBRARY } from "@/lib/data/sources";
import type { NumericInput, SpotInputs } from "@/types";

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

function coerceNumber(value: NumericInput, field: string, errors: string[], allowBlank = false): NumericInput {
  if (allowBlank && (value === "" || value === null || value === undefined)) return "";
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a finite number.`);
    return 0;
  }
  return parsed;
}

function isPositive(value: NumericInput): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function validateSpotInputs(input: Partial<SpotInputs>): ValidationResult<SpotInputs> {
  const errors: string[] = [];
  const defaults = spotDefaultValues as unknown as SpotInputs;
  const value: SpotInputs = {
    ...defaults,
    ...input,
    smokePresent: Boolean(input.smokePresent ?? defaults.smokePresent),
    extractorOn: Boolean(input.extractorOn ?? defaults.extractorOn),
    imperfectAlignment: Boolean(input.imperfectAlignment ?? defaults.imperfectAlignment),
    useExpander: Boolean(input.useExpander ?? defaults.useExpander),
  };

  value.measuredWatt = coerceNumber(value.measuredWatt, "measuredWatt", errors, true);
  value.peakWatt = coerceNumber(value.peakWatt, "peakWatt", errors, true);
  value.powerPercent = coerceNumber(value.powerPercent, "powerPercent", errors);
  value.ampValue = coerceNumber(value.ampValue, "ampValue", errors, true);
  value.hz = coerceNumber(value.hz, "hz", errors);
  value.lensDiameter = coerceNumber(value.lensDiameter, "lensDiameter", errors);
  value.focalLength = coerceNumber(value.focalLength, "focalLength", errors);
  value.mirrorDiameter = coerceNumber(value.mirrorDiameter, "mirrorDiameter", errors);
  value.mirrorCount = 3;
  value.mirrorTempC = coerceNumber(value.mirrorTempC, "mirrorTempC", errors, true);
  value.alignmentLossPercent = coerceNumber(value.alignmentLossPercent, "alignmentLossPercent", errors);
  value.expanderMultiplier = coerceNumber(value.expanderMultiplier, "expanderMultiplier", errors);

  if (!SOURCE_LIBRARY.some((source) => source.id === value.sourceId)) errors.push("sourceId is not a known source preset.");
  if (!(value.finish in FINISHES)) errors.push("finish is not a known lens finish.");
  if (!(value.lensShape in LENS_SHAPES)) errors.push("lensShape is not a known lens shape.");
  if (!(value.mirrorFinish in MIRROR_FINISHES)) errors.push("mirrorFinish is not a known mirror finish.");
  if (!isPositive(value.hz)) errors.push("hz must be greater than zero.");
  if (!isPositive(value.lensDiameter)) errors.push("lensDiameter must be greater than zero.");
  if (!isPositive(value.focalLength)) errors.push("focalLength must be greater than zero.");
  if (!isPositive(value.mirrorDiameter)) errors.push("mirrorDiameter must be greater than zero.");
  if (!isPositive(value.expanderMultiplier)) errors.push("expanderMultiplier must be greater than zero.");

  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

import type { UnitSystem } from "@/types";

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatCompact(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export function formatLength(mm: number, unitSystem: UnitSystem = "metric", digits = 2): string {
  if (unitSystem === "imperial") {
    return `${formatCompact(mmToInches(mm), digits)} in`;
  }
  return `${formatCompact(mm, digits)} mm`;
}

export function formatOptionLength(mm: number, unitSystem: UnitSystem = "metric"): string {
  return unitSystem === "imperial"
    ? `${formatCompact(mmToInches(mm), 2)} in`
    : `${formatCompact(mm, Number.isInteger(mm) ? 0 : 2)} mm`;
}

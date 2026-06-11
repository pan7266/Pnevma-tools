import type { UnitSystem } from "@/types";

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

function displayDigits(digits: number): number {
  return Math.min(Math.max(digits, 0), 2);
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "0";
  const safeDigits = displayDigits(digits);
  return value.toLocaleString(undefined, {
    maximumFractionDigits: safeDigits,
    minimumFractionDigits: safeDigits,
  });
}

export function formatCompact(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: displayDigits(digits),
  });
}

export function lengthUnit(unitSystem: UnitSystem = "metric"): "mm" | "in" {
  return unitSystem === "imperial" ? "in" : "mm";
}

export function temperatureUnit(unitSystem: UnitSystem = "metric"): "C" | "F" {
  return unitSystem === "imperial" ? "F" : "C";
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

export function displayLengthValue(mm: unknown, unitSystem: UnitSystem = "metric", digits = 6): string {
  if (mm === "" || mm === null || mm === undefined) return "";
  const parsed = Number(String(mm).replace(",", "."));
  if (!Number.isFinite(parsed)) return "";
  const displayValue = unitSystem === "imperial" ? mmToInches(parsed) : parsed;
  return Number(displayValue.toFixed(displayDigits(digits))).toString();
}

export function parseLengthValue(value: string, unitSystem: UnitSystem = "metric"): string {
  if (value.trim() === "") return "";
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return value;
  return (unitSystem === "imperial" ? inchesToMm(parsed) : parsed).toString();
}

export function celsiusToFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) / 1.8;
}

export function displayTemperatureValue(celsius: unknown, unitSystem: UnitSystem = "metric", digits = 1): string {
  if (celsius === "" || celsius === null || celsius === undefined) return "";
  const parsed = Number(String(celsius).replace(",", "."));
  if (!Number.isFinite(parsed)) return "";
  const displayValue = unitSystem === "imperial" ? celsiusToFahrenheit(parsed) : parsed;
  return Number(displayValue.toFixed(displayDigits(digits))).toString();
}

export function parseTemperatureValue(value: string, unitSystem: UnitSystem = "metric"): string {
  if (value.trim() === "") return "";
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return value;
  return (unitSystem === "imperial" ? fahrenheitToCelsius(parsed) : parsed).toString();
}

export function formatStepsPerLength(stepsPerMm: number | null | undefined, unitSystem: UnitSystem = "metric", digits = 4): string {
  if (!Number.isFinite(stepsPerMm)) return "N/A";
  const value = unitSystem === "imperial" ? Number(stepsPerMm) * 25.4 : Number(stepsPerMm);
  return `${formatNumber(value, digits)} steps/${lengthUnit(unitSystem)}`;
}

export function displayStepsPerLengthValue(stepsPerMm: unknown, unitSystem: UnitSystem = "metric", digits = 4): string {
  if (stepsPerMm === "" || stepsPerMm === null || stepsPerMm === undefined) return "";
  const parsed = Number(String(stepsPerMm).replace(",", "."));
  if (!Number.isFinite(parsed)) return "";
  const displayValue = unitSystem === "imperial" ? parsed * 25.4 : parsed;
  return Number(displayValue.toFixed(displayDigits(digits))).toString();
}

export function parseStepsPerLengthValue(value: string, unitSystem: UnitSystem = "metric"): string {
  if (value.trim() === "") return "";
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return value;
  return (unitSystem === "imperial" ? parsed / 25.4 : parsed).toString();
}

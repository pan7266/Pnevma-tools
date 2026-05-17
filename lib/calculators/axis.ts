import { AXIS_TEXT } from "@/locales";
import type {
  AxisCalc,
  AxisGraphData,
  AxisInputs,
  AxisIntervalResult,
  AxisKey,
  AxisMechanics,
  AxisResult,
  AxisSpotResult,
  Lang,
} from "@/types";

function stripGreekAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getAxisLabel(key: string, lang: Lang = "en"): string {
  const packs = AXIS_TEXT as Readonly<Record<string, Readonly<Record<string, string>>>>;
  const pack = packs[lang] || packs.en;
  const value = pack[key as keyof typeof pack] || AXIS_TEXT.en[key as keyof typeof AXIS_TEXT.en] || key;
  return lang === "el" ? stripGreekAccents(String(value)) : String(value);
}

function parseInputNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function numberValue(value: unknown): number | null {
  return parseInputNumber(value);
}

function getRequestedLineInterval(input: AxisInputs): number | null {
  const lineInterval = numberValue(input.lineInterval);
  if (isPositive(lineInterval)) return lineInterval;
  const dpi = numberValue(input.dpi);
  return isPositive(dpi) ? 25.4 / dpi : null;
}

export function getActiveAxisKey(scanMode: AxisInputs["scanMode"]): AxisKey {
  return scanMode === "horizontal" ? "y" : "x";
}

export function getTravelPerRev(axis: AxisMechanics): number | null {
  const beltPitch = numberValue(axis.beltPitch);
  const pulleyTeeth = numberValue(axis.pulleyTeeth);
  const screwPitch = numberValue(axis.screwPitch);
  const threadStarts = numberValue(axis.threadStarts);
  const directTravelPerRev = numberValue(axis.directTravelPerRev);
  if (axis.driveType === "belt") {
    return isPositive(beltPitch) && isPositive(pulleyTeeth) ? beltPitch * pulleyTeeth : null;
  }
  if (axis.driveType === "leadScrew") {
    return isPositive(screwPitch) && isPositive(threadStarts) ? screwPitch * threadStarts : null;
  }
  if (axis.driveType === "direct") {
    return isPositive(directTravelPerRev) ? directTravelPerRev : null;
  }
  return null;
}

export function calculateAxisMechanics(axis: AxisMechanics, lang: Lang = "en"): AxisCalc {
  const controllerStepsPerMm = numberValue(axis.controllerStepsPerMm);
  if (axis.driveType === "controllerOnly") {
    if (!isPositive(controllerStepsPerMm)) {
      return {
        valid: false,
        reason: getAxisLabel("controllerMissingForOnly", lang),
        travelPerRev: null,
        fullStepsPerRev: null,
        microstepsPerRev: null,
        stepsPerMm: 0,
        mmPerMicrostep: 0,
      };
    }
    return {
      valid: true,
      controllerOnly: true,
      travelPerRev: null,
      fullStepsPerRev: null,
      microstepsPerRev: null,
      stepsPerMm: controllerStepsPerMm,
      mmPerMicrostep: 1 / controllerStepsPerMm,
    };
  }

  const motorAngle = numberValue(axis.motorAngle);
  const microstepping = numberValue(axis.microstepping);
  if (!isPositive(motorAngle) || !isPositive(microstepping)) {
    return {
      valid: false,
      reason: getAxisLabel("invalidInputs", lang),
      travelPerRev: null,
      fullStepsPerRev: null,
      microstepsPerRev: null,
      stepsPerMm: 0,
      mmPerMicrostep: 0,
    };
  }

  const travelPerRev = getTravelPerRev(axis);
  if (!isPositive(travelPerRev)) {
    return {
      valid: false,
      reason: getAxisLabel("invalidInputs", lang),
      travelPerRev: null,
      fullStepsPerRev: null,
      microstepsPerRev: null,
      stepsPerMm: 0,
      mmPerMicrostep: 0,
    };
  }

  const fullStepsPerRev = 360 / motorAngle;
  const microstepsPerRev = fullStepsPerRev * microstepping;
  const stepsPerMm = microstepsPerRev / travelPerRev;
  return {
    valid: true,
    controllerOnly: false,
    travelPerRev,
    fullStepsPerRev,
    microstepsPerRev,
    stepsPerMm,
    mmPerMicrostep: 1 / stepsPerMm,
  };
}

export function calculateAxisInterval(input: AxisInputs, calc: AxisCalc): AxisIntervalResult | null {
  const lineInterval = getRequestedLineInterval(input);
  if (!calc.valid || !isPositive(lineInterval) || !isPositive(calc.mmPerMicrostep)) return null;
  const intervalMicrosteps = lineInterval / calc.mmPerMicrostep;
  const nearestMicrosteps = Math.round(intervalMicrosteps);
  const nearestCleanInterval = nearestMicrosteps * calc.mmPerMicrostep;
  const nearestCleanDpi = 25.4 / nearestCleanInterval;
  const errorMm = lineInterval - nearestCleanInterval;
  const errorPercent = (errorMm / lineInterval) * 100;
  const clean = Math.abs(intervalMicrosteps - nearestMicrosteps) < 0.001;
  return {
    intervalMicrosteps,
    nearestMicrosteps,
    nearestCleanInterval,
    nearestCleanDpi,
    errorMm,
    errorPercent,
    clean,
  };
}

export function calculateAxisSpot(input: AxisInputs): AxisSpotResult | null {
  const lineInterval = getRequestedLineInterval(input);
  const spotDiameter = numberValue(input.spotDiameter);
  if (!isPositive(lineInterval) || !isPositive(spotDiameter)) return null;
  const ratio = lineInterval / spotDiameter;
  const overlap = Math.max(0, (1 - ratio) * 100);
  if (ratio < 0.55) {
    return { ratio, overlap, statusKey: "spotHighOverlap", textKey: "spotHighText", className: "warn" };
  }
  if (ratio <= 0.9) {
    return { ratio, overlap, statusKey: "spotBalanced", textKey: "spotBalancedText", className: "ok" };
  }
  return { ratio, overlap, statusKey: "spotLowOverlap", textKey: "spotLowText", className: "warn" };
}

function getControllerComparison(axis: AxisMechanics, calc: AxisCalc): AxisResult["controller"] {
  const controllerStepsPerMm = numberValue(axis.controllerStepsPerMm);
  if (calc.controllerOnly) {
    return {
      statusKey: "controllerOnlyDrive",
      noteKey: "controllerOnlyNote",
      diffPercent: null,
      className: "ok",
    };
  }
  if (!isPositive(controllerStepsPerMm)) {
    return {
      statusKey: "notAvailable",
      noteKey: "noControllerValue",
      diffPercent: null,
      className: "",
    };
  }
  const diffPercent = ((controllerStepsPerMm - calc.stepsPerMm) / calc.stepsPerMm) * 100;
  const match = Math.abs(diffPercent) <= 0.25;
  return {
    statusKey: match ? "controllerMatch" : "controllerMismatch",
    noteKey: match ? "controllerMatch" : "controllerMismatch",
    diffPercent,
    className: match ? "ok" : "warn",
  };
}

function getDualMotorMessageKey(axis: AxisMechanics): string {
  if (axis.dualMotorMode === "none") return "";
  if (axis.dualMotorMode === "specialRatio") return "specialDual";
  const secondMotorAngle = numberValue(axis.secondMotorAngle) || 0;
  const motorAngle = numberValue(axis.motorAngle) || 0;
  const secondPulleyTeeth = numberValue(axis.secondPulleyTeeth) || 0;
  const pulleyTeeth = numberValue(axis.pulleyTeeth) || 0;
  const secondMicrostepping = numberValue(axis.secondMicrostepping) || 0;
  const microstepping = numberValue(axis.microstepping) || 0;
  const matched =
    Math.abs(secondMotorAngle - motorAngle) < 0.0001 &&
    Math.abs(secondPulleyTeeth - pulleyTeeth) < 0.0001 &&
    Math.abs(secondMicrostepping - microstepping) < 0.0001;
  return matched ? "matchedDual" : "suspiciousDual";
}

function getGraphData(interval: AxisIntervalResult | null, calc: AxisCalc, requestedDpi: number | null): AxisGraphData | null {
  if (!interval) return null;
  const width = 692;
  const start = 64;
  const total = Math.max(interval.nearestMicrosteps + 2, 4);
  const requestedX = start + width * Math.min(interval.intervalMicrosteps / Math.max(total, 1), 1);
  const nearestX = start + width * Math.min(interval.nearestMicrosteps / Math.max(total, 1), 1);
  const dpiMicrosteps = requestedDpi && requestedDpi > 0 && calc.mmPerMicrostep > 0 ? (25.4 / requestedDpi) / calc.mmPerMicrostep : interval.intervalMicrosteps;
  const currentDpiX = start + width * Math.min(dpiMicrosteps / Math.max(total, 1), 1);
  const ticks = Array.from({ length: total + 1 }, (_, i) => start + (i / total) * width);
  return { requestedX, nearestX, currentDpiX, ticks };
}

export function calculateAxis(input: AxisInputs): AxisResult {
  const lang = input.language || "en";
  const activeAxisKey = getActiveAxisKey(input.scanMode);
  const activeAxis = input.axes[activeAxisKey];
  const calc = calculateAxisMechanics(activeAxis, lang);
  const requestedLineInterval = getRequestedLineInterval(input);
  const dpiValue = numberValue(input.dpi);
  const requestedDpi = isPositive(dpiValue) ? dpiValue : requestedLineInterval ? 25.4 / requestedLineInterval : null;
  const interval = calculateAxisInterval(input, calc);
  const spot = calculateAxisSpot(input);
  const warnings = [];
  if (!calc.valid) {
    warnings.push({ code: "invalid-axis", message: calc.reason || getAxisLabel("invalidInputs", lang) });
  }
  if (!interval && calc.valid) {
    warnings.push({ code: "invalid-interval", message: getAxisLabel("invalidInputs", lang) });
  }

  return {
    activeAxisKey,
    activeAxis,
    requestedLineInterval,
    requestedDpi,
    calc,
    interval,
    spot,
    controller: getControllerComparison(activeAxis, calc),
    dualMotorMessageKey: getDualMotorMessageKey(activeAxis),
    graphData: getGraphData(interval, calc, requestedDpi),
    warnings,
  };
}

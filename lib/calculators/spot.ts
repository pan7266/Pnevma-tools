import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { LENS_SHAPES } from "@/lib/data/lenses";
import { SOURCE_LIBRARY } from "@/lib/data/sources";
import { formatCompact } from "@/lib/units/convert";
import type {
  FinishPreset,
  LensPreset,
  MirrorPreset,
  SourcePreset,
  SpotInputs,
  SpotResult,
  SpotWarning,
} from "@/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSource(id: string): SourcePreset {
  const sources = SOURCE_LIBRARY as readonly SourcePreset[];
  return sources.find((source) => source.id === id) || sources[0];
}

export function getFilteredSources(family: string): SourcePreset[] {
  const sources = SOURCE_LIBRARY as readonly SourcePreset[];
  return sources.filter((source) => family === "all" || source.excitation === family);
}

export function estimateBestCurrentMa(source: SourcePreset): number | null {
  if (source.currentBestMa) return source.currentBestMa;
  if (source.excitation === "RF") return null;
  if (source.ratedWatt <= 45) return 18;
  if (source.ratedWatt <= 65) return 20;
  if (source.ratedWatt <= 90) return 24;
  if (source.ratedWatt <= 110) return 28;
  if (source.ratedWatt <= 140) return 30;
  if (source.ratedWatt <= 160) return 32;
  return 34;
}

export function getFinish(values: SpotInputs, finishKey = values.finish): FinishPreset {
  const finishes = FINISHES as Record<string, FinishPreset>;
  const base = { ...(finishes[finishKey] || finishes.CVD) };
  if (finishKey === "CVD" && values.cvdMaker === "iivi") {
    base.transmission = 0.965;
    base.thermal = 0.00085;
    base.quality = 1.0;
    base.maker = "II-VI / Coherent";
  } else {
    base.maker = finishKey;
  }
  return base;
}

export function calculateSpot(
  values: SpotInputs,
  finishKey = values.finish,
  wattOverride: number | null = null,
): SpotResult {
  const source = getSource(values.sourceId);
  const finish = getFinish(values, finishKey);
  const shapes = LENS_SHAPES as Record<string, LensPreset>;
  const shape = shapes[values.lensShape] || shapes.meniscus;
  const lensDiameter = Math.max(toNumber(values.lensDiameter), 0.01);
  const focalLength = Math.max(toNumber(values.focalLength), 0.01);
  const hz = Math.max(toNumber(values.hz), 1);
  const mirrors = MIRROR_FINISHES as Record<string, MirrorPreset>;
  const mirror = mirrors[values.mirrorFinish] || mirrors.enhancedCopper;
  const mirrorCount = 3;
  const mirrorDiameter = Math.max(toNumber(values.mirrorDiameter), 0.01);
  const mirrorClearAperture = mirrorDiameter * 0.85;
  const clearAperture = lensDiameter * 0.9;
  const sourceBeam = source.beamMm;
  const expanderMultiplier = values.useExpander ? Math.max(toNumber(values.expanderMultiplier), 1) : 1;
  const expandedBeam = sourceBeam * expanderMultiplier;
  const mirrorClipped = expandedBeam > mirrorClearAperture;
  const lensClipped = expandedBeam > clearAperture;
  const clipped = mirrorClipped || lensClipped;
  const effectiveBeam = Math.min(expandedBeam, clearAperture, mirrorClearAperture);
  const powerPercent = clamp(toNumber(values.powerPercent), 0, 100);
  const measuredWattRaw = toNumber(values.measuredWatt);
  const peakWattRaw = toNumber(values.peakWatt);
  const sourcePeakWatt = toNumber(source.peakWatt);
  const hasMeasuredWatt = measuredWattRaw > 0;
  const hasPeakWatt = peakWattRaw > 0 || sourcePeakWatt > 0;
  const peakWatt = peakWattRaw > 0 ? peakWattRaw : sourcePeakWatt > 0 ? sourcePeakWatt : null;
  const exactOrRatedWatt = hasMeasuredWatt ? measuredWattRaw : source.ratedWatt;
  const powerBaseWatt = Math.max(exactOrRatedWatt, peakWatt || 0);
  const wattBasis = peakWatt && peakWatt >= exactOrRatedWatt ? "peak" : hasMeasuredWatt ? "exact" : "rated";
  const wattCeiling = Math.max(source.ratedWatt, powerBaseWatt, peakWatt || 0);
  const selectedWatt =
    typeof wattOverride === "number"
      ? clamp(wattOverride, 0, wattCeiling)
      : powerBaseWatt * (powerPercent / 100);
  const wavelengthMm = source.wavelengthUm / 1000;
  const opticalSpot = (4 * source.m2 * wavelengthMm * focalLength) / (Math.PI * effectiveBeam);
  const clippingReference = Math.max(expandedBeam, 0.01);
  const clippingPenalty = clipped ? 1 + ((expandedBeam - effectiveBeam) / clippingReference) * 0.42 : 1;
  const frequencyFactor = Math.sqrt(1000 / Math.max(hz, 1));
  const thermalFactor = 1 + finish.thermal * selectedWatt * frequencyFactor;
  const alignmentLoss = values.imperfectAlignment
    ? clamp(toNumber(values.alignmentLossPercent) / 100, 0, 0.18)
    : 0;
  const alignmentSpotPenalty = values.imperfectAlignment ? 1 + alignmentLoss * 0.75 : 1;
  const mirrorTempC = toNumber(values.mirrorTempC);
  const hasMirrorTemp = mirrorTempC > 0;
  const tempLossPerMirror = hasMirrorTemp ? Math.max(0, mirrorTempC - 35) * mirror.thermalCoefficient : 0;
  const perMirrorReflectivity = clamp(mirror.reflectivity - tempLossPerMirror, 0.88, 0.999);
  const mirrorTransmission = Math.pow(perMirrorReflectivity, mirrorCount);
  const smokeLoss = values.smokePresent ? 0.03 : 0;
  const atmosphereTransmission = 1 - smokeLoss;
  const alignmentTransmission = 1 - alignmentLoss;
  const clippingTransmission = clipped
    ? clamp(1 - ((expandedBeam - effectiveBeam) / clippingReference) * 0.18, 0.7, 1)
    : 1;
  const pathTransmission =
    mirrorTransmission * atmosphereTransmission * alignmentTransmission * clippingTransmission;
  const spot = opticalSpot * finish.quality * shape.factor * clippingPenalty * thermalFactor * alignmentSpotPenalty;
  const deliveredWatt = selectedWatt * finish.transmission * pathTransmission;
  const mirrorAbsorbedWatt = selectedWatt * (1 - mirrorTransmission);
  const atmosphereLostWatt = selectedWatt * mirrorTransmission * (1 - atmosphereTransmission);
  const alignmentLostWatt =
    selectedWatt * mirrorTransmission * atmosphereTransmission * (1 - alignmentTransmission);
  const pulseEnergyMj = (selectedWatt / hz) * 1000;
  const currentBestMa = estimateBestCurrentMa(source);
  const currentMinMa = currentBestMa ? source.currentMinMa || Math.max(4, currentBestMa * 0.18) : null;
  const currentPowerRatio = clamp(selectedWatt / Math.max(powerBaseWatt, 1), 0, 1.15);
  const expectedCurrentMa =
    currentBestMa && currentMinMa
      ? currentMinMa + (currentBestMa - currentMinMa) * currentPowerRatio
      : null;
  const ampValue = toNumber(values.ampValue);
  const hasAmp = ampValue > 0;
  const ampUncertainty = values.ampMeterType === "analog" ? 0.025 : 0.01;
  const ampUpperMa = hasAmp ? ampValue * (1 + ampUncertainty) : 0;
  const currentForStability = hasAmp ? ampUpperMa : expectedCurrentMa || 0;
  const stabilityRatio = currentForStability && currentBestMa ? currentForStability / currentBestMa : 0;
  const wattStressRatio = selectedWatt / Math.max(exactOrRatedWatt, 1);
  const beamStability =
    currentForStability && currentBestMa
      ? stabilityRatio > 1
        ? "unstable"
        : stabilityRatio > 0.92
          ? "borderline"
          : "stable"
      : wattStressRatio > 1
        ? "unstable"
        : wattStressRatio > 0.92
          ? "borderline"
          : "stable";
  const stabilityReason =
    beamStability === "unstable"
      ? hasAmp
        ? `Ammeter reads up to ${formatCompact(ampUpperMa, 1)} mA after ${formatCompact(
            ampUncertainty * 100,
            1,
          )}% ${values.ampMeterType} uncertainty, above the ${formatCompact(currentBestMa || 0, 1)} mA best current.`
        : `Selected watt is ${formatCompact(
            wattStressRatio * 100,
            1,
          )}% of the rated/exact watt basis, so the tube is being pushed into peak range.`
      : beamStability === "borderline"
        ? hasAmp
          ? `Ammeter reads near the best-current limit: ${formatCompact(ampUpperMa, 1)} mA vs ${formatCompact(
              currentBestMa || 0,
              1,
            )} mA.`
          : `Estimated current at this power is near the best-current limit: ${formatCompact(
              expectedCurrentMa || 0,
              1,
            )} mA vs ${formatCompact(currentBestMa || 0, 1)} mA.`
        : currentBestMa
          ? `Estimated/current input is below the best-current limit: ${formatCompact(
              currentForStability || 0,
              1,
            )} mA vs ${formatCompact(currentBestMa, 1)} mA.`
          : "RF sources do not use the glass-tube mA stability check, so stability is estimated from watt stress only.";

  const warnings: SpotWarning[] = [];
  if (clipped) {
    warnings.push({
      code: "clipped",
      message: "The expanded beam exceeds a mirror or lens clear aperture, so clipping loss is included.",
    });
  }

  return {
    source,
    finish,
    shape,
    mirror,
    mirrorCount,
    mirrorDiameter,
    mirrorClearAperture,
    lensDiameter,
    focalLength,
    hz,
    clearAperture,
    sourceBeam,
    expandedBeam,
    expanderMultiplier,
    mirrorClipped,
    lensClipped,
    clipped,
    effectiveBeam,
    hasMeasuredWatt,
    hasPeakWatt,
    exactOrRatedWatt,
    powerBaseWatt,
    wattBasis,
    peakWatt,
    wattCeiling,
    selectedWatt,
    opticalSpot,
    clippingPenalty,
    thermalFactor,
    alignmentLoss,
    perMirrorReflectivity,
    mirrorTransmission,
    smokeLoss,
    currentMinMa,
    expectedCurrentMa,
    atmosphereTransmission,
    pathTransmission,
    clippingTransmission,
    spot,
    deliveredWatt,
    mirrorAbsorbedWatt,
    atmosphereLostWatt,
    alignmentLostWatt,
    pulseEnergyMj,
    currentBestMa,
    hasAmp,
    ampValue,
    ampUpperMa,
    ampUncertainty,
    wattStressRatio,
    stabilityReason,
    beamStability,
    warnings,
    graphData: {
      wattCeiling,
      selectedWatt,
      sourceBeam,
      spot,
    },
  };
}

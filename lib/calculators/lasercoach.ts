import { createDefaultCorrection, LASERCOACH_SAFE_MAX_PASSES } from "@/lib/data/lasercoach";
import type {
  CorrectionHistory,
  LaserAirAssist,
  LaserDesiredQuality,
  LaserJobFeedback,
  LaserMachine,
  LaserMachineMotionSnapshot,
  LaserMaterial,
  LaserOperationPreset,
  LaserOperationType,
  LaserProblemType,
  LaserRecommendation,
  MachineMaterialCorrection,
  MachineMotionProfile,
  VectorAnalysis,
} from "@/types";

export interface LaserRecommendationInput {
  vectorJobId: string;
  machine: LaserMachine;
  motionProfile: MachineMotionProfile;
  material: LaserMaterial;
  preset: LaserOperationPreset;
  analysis: VectorAnalysis;
  correction?: MachineMaterialCorrection | null;
  operationType: LaserOperationType;
  desiredQuality: LaserDesiredQuality;
  now?: string;
}

export interface FeedbackProcessingInput {
  feedback: LaserJobFeedback;
  recommendation: LaserRecommendation;
  correction?: MachineMaterialCorrection | null;
  now?: string;
}

export interface FeedbackProcessingResult {
  correction: MachineMaterialCorrection;
  history: CorrectionHistory;
  warnings: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function safeNumber(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function desiredQualityMultiplier(mode: LaserDesiredQuality): number {
  if (mode === "Fast") return 1.2;
  if (mode === "CleanEdge") return 0.82;
  if (mode === "DeepEngrave") return 0.68;
  if (mode === "FineDetail") return 0.74;
  return 1;
}

function operationSpeedLimit(operationType: LaserOperationType): number {
  if (operationType === "Cut") return 90;
  if (operationType === "Score") return 260;
  if (operationType === "LineEngrave") return 360;
  if (operationType === "FillEngrave") return 520;
  if (operationType === "PhotoEngrave") return 460;
  return 420;
}

function operationAcceleration(profile: MachineMotionProfile, operationType: LaserOperationType): number {
  if (operationType === "FillEngrave" || operationType === "PhotoEngrave") {
    return safeNumber(profile.engraveAccelerationMmSec2, safeNumber(profile.scanAccelerationMmSec2, profile.cutAccelerationMmSec2));
  }
  if (operationType === "LineEngrave" || operationType === "Mark") {
    return safeNumber(profile.scanAccelerationMmSec2, profile.cutAccelerationMmSec2);
  }
  return profile.cutAccelerationMmSec2;
}

function geometryAdjustments(analysis: VectorAnalysis, operationType: LaserOperationType) {
  const warnings: string[] = [];
  let speedMultiplier = 1;
  let powerBiasPercent = 0;
  let passBias = 0;
  let riskScore = 0;

  if (analysis.hasUnsupportedElements) {
    warnings.push("Unsupported SVG elements were ignored; verify the imported geometry.");
    riskScore += 2;
  }
  if (analysis.duplicateLineCount > 0) {
    warnings.push("Duplicate or near-duplicate lines can overburn the same path.");
    speedMultiplier *= 0.92;
    powerBiasPercent -= 2;
    riskScore += 1;
  }
  if (analysis.openPathCount > 0 && operationType === "Cut") {
    warnings.push("Open paths may not cut closed parts.");
    riskScore += 1;
  }
  if (analysis.tinyFeatureCount > 0) {
    warnings.push("Tiny features need lower speed and careful power to avoid detail loss.");
    speedMultiplier *= 0.86;
    powerBiasPercent -= operationType === "Cut" ? 1 : 3;
    riskScore += 1;
  }
  if (analysis.smallestFeatureMm !== null && analysis.smallestFeatureMm !== undefined && analysis.smallestFeatureMm < 0.8) {
    warnings.push("Smallest feature is below 0.8 mm; material and kerf may erase it.");
    speedMultiplier *= 0.9;
    riskScore += 1;
  }
  if (analysis.smallestGapMm !== null && analysis.smallestGapMm !== undefined && analysis.smallestGapMm < 0.5) {
    warnings.push("Small gaps may merge from kerf, plume shielding, or heat.");
    riskScore += 1;
  }
  if (analysis.sharpCornerCount > 12) {
    warnings.push("Many sharp corners can collect heat because the head slows at direction changes.");
    speedMultiplier *= 0.9;
    powerBiasPercent -= 2;
    riskScore += 1;
  }
  if (operationType === "Cut" && analysis.totalCutLengthMm > 2500) {
    warnings.push("Long cut length increases heat load; use hold-down, airflow, and supervised testing.");
  }
  if ((operationType === "FillEngrave" || operationType === "PhotoEngrave") && !analysis.estimatedEngraveAreaMm2) {
    warnings.push("No filled area was detected; verify fill layers before engraving.");
  }
  if (operationType === "Cut" && analysis.boundingBoxWidthMm < 8 && analysis.boundingBoxHeightMm < 8) {
    passBias += 1;
    powerBiasPercent -= 4;
    warnings.push("Very small cut geometry is biased toward another pass instead of more power.");
  }

  return {
    speedMultiplier: clamp(speedMultiplier, 0.55, 1.08),
    powerBiasPercent,
    passBias,
    riskLevel: riskScore >= 3 ? "High" as const : riskScore >= 1 ? "Medium" as const : "Low" as const,
    warnings,
  };
}

function machineMotionSnapshot(machine: LaserMachine, profile: MachineMotionProfile, preset: LaserOperationPreset): LaserMachineMotionSnapshot {
  return {
    maxSpeedMmSec: profile.maxSpeedMmSec,
    maxAccelerationMmSec2: profile.maxAccelerationMmSec2,
    idleSpeedMmSec: profile.idleSpeedMmSec,
    idleAccelerationMmSec2: profile.idleAccelerationMmSec2,
    cutAccelerationMmSec2: profile.cutAccelerationMmSec2,
    scanAccelerationMmSec2: profile.scanAccelerationMmSec2 ?? null,
    engraveAccelerationMmSec2: profile.engraveAccelerationMmSec2 ?? null,
    jumpOffSpeedMmSec: profile.jumpOffSpeedMmSec ?? null,
    startSpeedMmSec: profile.startSpeedMmSec ?? null,
    cornerSpeedMmSec: profile.cornerSpeedMmSec ?? null,
    accelFactorPercent: profile.accelFactorPercent,
    g0AccelFactorPercent: profile.g0AccelFactorPercent,
    speedFactorPercent: profile.speedFactorPercent,
    controllerType: machine.controllerType,
    controllerModel: machine.controllerModel ?? null,
    bedWidthMm: machine.bedWidthMm,
    bedHeightMm: machine.bedHeightMm,
    tubePowerW: machine.tubePowerW,
    realMeasuredMaxPowerW: machine.realMeasuredMaxPowerW ?? null,
    lensFocalLengthMm: preset.lensFocalLengthMm,
    lensDiameterMm: machine.defaultLensDiameterMm ?? null,
    nozzleType: machine.nozzleType ?? null,
    airAssistType: machine.airAssistType ?? null,
    exhaustNotes: machine.exhaustNotes ?? null,
    kerfMm: machine.defaultKerfMm,
    defaultFocusOffsetMm: machine.defaultFocusOffsetMm,
  };
}

function motionWarnings(profile: MachineMotionProfile, analysis: VectorAnalysis, speedMmSec: number, operationType: LaserOperationType): string[] {
  const warnings: string[] = [];
  const accel = Math.max(operationAcceleration(profile, operationType), 1);
  const accelDistanceMm = speedMmSec ** 2 / (2 * accel);
  const smallestFeature = analysis.smallestFeatureMm ?? analysis.smallestGapMm ?? null;

  if (smallestFeature !== null && accelDistanceMm > smallestFeature * 2) {
    warnings.push("Recommended speed is aggressive for the stored acceleration profile and smallest geometry.");
  }
  if (profile.idleAccelerationMmSec2 > profile.maxAccelerationMmSec2 * 0.9 || profile.g0AccelFactorPercent > 120) {
    warnings.push("Travel acceleration or G0 accel factor may be high enough to risk lost steps on rapid moves.");
  }
  if (operationType === "Cut" && profile.cutAccelerationMmSec2 < 500 && speedMmSec > 30) {
    warnings.push("Cut acceleration is low for this speed; real corner dwell may be higher than the estimate.");
  }
  if ((operationType === "FillEngrave" || operationType === "PhotoEngrave") && !profile.scanAccelerationMmSec2) {
    warnings.push("Scan acceleration is unknown, so engraving risk and time use cut acceleration as a fallback.");
  }

  return warnings;
}

function estimateJobTimeSeconds(
  analysis: VectorAnalysis,
  profile: MachineMotionProfile,
  operationType: LaserOperationType,
  speedMmSec: number,
  lineIntervalMm: number | null | undefined,
): number {
  const cutLength = Math.max(analysis.totalCutLengthMm || 0, 0);
  const travelEstimate = Math.max(analysis.pathCount - 1, 0) * Math.max(Math.min(analysis.boundingBoxWidthMm, analysis.boundingBoxHeightMm) * 0.35, 4);
  const idleSpeed = Math.max(profile.idleSpeedMmSec, 1);
  const operationAccel = Math.max(operationAcceleration(profile, operationType), 1);
  const idleAccel = Math.max(profile.idleAccelerationMmSec2, 1);
  const cutTime = cutLength / Math.max(speedMmSec, 1);
  const travelTime = travelEstimate / idleSpeed;
  const accelPenalty = analysis.pathCount * (speedMmSec / operationAccel) + Math.max(analysis.pathCount - 1, 0) * (idleSpeed / idleAccel);

  if ((operationType === "FillEngrave" || operationType === "PhotoEngrave") && analysis.estimatedEngraveAreaMm2 && lineIntervalMm) {
    const scanLineCount = analysis.boundingBoxHeightMm / Math.max(lineIntervalMm, 0.01);
    const scanDistance = scanLineCount * Math.max(analysis.boundingBoxWidthMm, 0);
    return round(scanDistance / Math.max(speedMmSec, 1) + travelTime + accelPenalty, 1);
  }

  return round(cutTime + travelTime + accelPenalty, 1);
}

export function createLaserRecommendation(input: LaserRecommendationInput): LaserRecommendation {
  const correction = input.correction ?? createDefaultCorrection(input.machine.id, input.material.id, input.operationType, input.preset.lensFocalLengthMm);
  const geometry = geometryAdjustments(input.analysis, input.operationType);
  const qualityMultiplier = desiredQualityMultiplier(input.desiredQuality);
  const opSpeedLimit = operationSpeedLimit(input.operationType);
  const rawSpeed =
    input.preset.baseSpeedMmSec *
    correction.speedMultiplier *
    geometry.speedMultiplier *
    qualityMultiplier;
  const speedFactorLimit = input.motionProfile.maxSpeedMmSec * clamp(input.motionProfile.speedFactorPercent / 100, 0.05, 2);
  const recommendedSpeed = clamp(rawSpeed, 0.1, Math.min(input.motionProfile.maxSpeedMmSec, speedFactorLimit, opSpeedLimit));
  const maxPower = clamp(input.preset.baseMaxPowerPercent + correction.maxPowerBiasPercent + geometry.powerBiasPercent, 0, 100);
  const minPower = clamp(Math.min(input.preset.baseMinPowerPercent + correction.minPowerBiasPercent, maxPower), 0, 100);
  const passes = clamp(Math.round(input.preset.passes + correction.passBias + geometry.passBias), 1, LASERCOACH_SAFE_MAX_PASSES);
  const lineIntervalMultiplier = correction.lineIntervalMultiplier ?? 1;
  const lineInterval = input.preset.lineIntervalMm ? round(input.preset.lineIntervalMm * lineIntervalMultiplier, 4) : null;
  const dpi = lineInterval ? round(25.4 / lineInterval, 1) : input.preset.dpi ?? null;
  const focusOffset = round(input.preset.focusOffsetMm + correction.focusBiasMm + input.machine.defaultFocusOffsetMm, 3);
  const motion = machineMotionSnapshot(input.machine, input.motionProfile, input.preset);
  const warnings = [
    ...geometry.warnings,
    ...motionWarnings(input.motionProfile, input.analysis, recommendedSpeed, input.operationType),
  ];

  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vectorJobId: input.vectorJobId,
    laserMachineId: input.machine.id,
    motionProfileId: input.motionProfile.id,
    materialId: input.material.id,
    operationType: input.operationType,
    recommendedSpeedMmSec: round(recommendedSpeed, 3),
    recommendedMinPowerPercent: round(minPower, 2),
    recommendedMaxPowerPercent: round(maxPower, 2),
    recommendedPasses: passes,
    recommendedLineIntervalMm: lineInterval,
    recommendedDpi: dpi,
    recommendedFocusOffsetMm: focusOffset,
    recommendedAirAssist: input.preset.airAssist,
    estimatedTimeSeconds: estimateJobTimeSeconds(input.analysis, input.motionProfile, input.operationType, recommendedSpeed, lineInterval),
    geometryRiskLevel: warnings.length >= 4 && geometry.riskLevel === "Medium" ? "High" : geometry.riskLevel,
    recommendationReasoningJson: {
      baseSpeedMmSec: input.preset.baseSpeedMmSec,
      correctionSpeedMultiplier: round(correction.speedMultiplier, 4),
      geometrySpeedMultiplier: round(geometry.speedMultiplier, 4),
      desiredQualityMultiplier: qualityMultiplier,
      geometryPowerBiasPercent: geometry.powerBiasPercent,
      geometryPassBias: geometry.passBias,
      operationSpeedLimitMmSec: opSpeedLimit,
      warnings,
    },
    machineMotionSnapshotJson: motion,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

function correctionFromRecommendation(recommendation: LaserRecommendation): MachineMaterialCorrection {
  return createDefaultCorrection(
    recommendation.laserMachineId,
    recommendation.materialId,
    recommendation.operationType,
    recommendation.machineMotionSnapshotJson.lensFocalLengthMm,
  );
}

function correctionImpact(confidenceScore: number, severity: number): number {
  const confidenceFactor = 0.45 + clamp(confidenceScore, 0, 1) * 0.55;
  return clamp(severity, 1, 5) * confidenceFactor;
}

function nudgeAirAssist(current: LaserAirAssist | null | undefined): string {
  if (current === "High") return "Air assist is already high; inspect nozzle, pressure, and extraction.";
  if (current === "Medium") return "Consider high air assist for this material after a scrap test.";
  return "Consider more air assist after a scrap test.";
}

export function processLaserJobFeedback(input: FeedbackProcessingInput): FeedbackProcessingResult {
  const now = input.now ?? new Date().toISOString();
  const before = input.correction ? { ...input.correction } : correctionFromRecommendation(input.recommendation);
  const after: MachineMaterialCorrection = { ...before };
  const warnings: string[] = [];
  const problem = input.feedback.problemType;
  const severity = clamp(input.feedback.severity, 1, 5);
  const impact = correctionImpact(before.confidenceScore, severity);
  const speedStep = 0.018 * impact;
  const powerStep = 1.4 * impact;
  let reason = "Feedback recorded without automatic correction.";

  if (input.feedback.wasSuccessful && problem === "None") {
    after.confidenceScore = clamp(before.confidenceScore + 0.08 + severity * 0.01, 0, 1);
    reason = "Successful job increased confidence.";
  } else if (problem === "DidNotCutThrough") {
    if ((input.feedback.actualMaxPowerPercent ?? input.recommendation.recommendedMaxPowerPercent) < 95) {
      after.maxPowerBiasPercent += powerStep;
      reason = "Did not cut through: increased max power bias cautiously.";
    } else {
      after.speedMultiplier -= speedStep;
      reason = "Did not cut through near high power: reduced speed multiplier cautiously.";
    }
    if (severity >= 4) after.passBias = clamp(after.passBias + 1, -2, 3);
  } else if (problem === "AlmostCutThrough") {
    if ((input.feedback.actualMaxPowerPercent ?? input.recommendation.recommendedMaxPowerPercent) < 92) after.maxPowerBiasPercent += powerStep * 0.55;
    else after.speedMultiplier -= speedStep * 0.55;
    reason = "Almost cut through: made a small energy correction.";
  } else if (problem === "TooMuchMelting") {
    after.speedMultiplier += speedStep;
    after.maxPowerBiasPercent -= powerStep;
    warnings.push(nudgeAirAssist(input.feedback.actualAirAssist ?? input.recommendation.recommendedAirAssist));
    reason = "Too much melting: raised speed and reduced max power bias.";
  } else if (problem === "BurnedCorners") {
    after.minPowerBiasPercent -= powerStep;
    warnings.push("Corner heat is strongly affected by acceleration, corner speed, and min power.");
    reason = "Burned corners: reduced min power bias and preserved machine motion settings.";
  } else if (problem === "SmokeStaining") {
    warnings.push("Smoke staining is usually masking, air assist, exhaust, dwell time, or material resin; do not solve it only with power.");
    after.speedMultiplier += speedStep * 0.35;
    reason = "Smoke staining: applied a small speed correction and added process warnings.";
  } else if (problem === "EngravingTooLight") {
    after.speedMultiplier -= speedStep * 0.65;
    after.maxPowerBiasPercent += powerStep * 0.65;
    reason = "Engraving too light: lowered speed and increased power bias.";
  } else if (problem === "EngravingTooDark" || problem === "ExcessiveCharring") {
    after.speedMultiplier += speedStep * 0.65;
    after.maxPowerBiasPercent -= powerStep * 0.75;
    reason = "Engraving too dark or charred: raised speed and lowered power bias.";
  } else if (problem === "Banding") {
    warnings.push("Banding is usually line interval, scan offset, belts, wheels, acceleration, or mechanics; correction factors were not changed.");
    reason = "Banding feedback recorded as a mechanical/process warning.";
  } else if (problem === "LostSteps") {
    warnings.push("Lost steps can mean idleAccelerationMmSec2, g0AccelFactorPercent, or cutAccelerationMmSec2 is too aggressive. Machine motion was not changed automatically.");
    reason = "Lost steps feedback recorded without mutating corrections or motion profile.";
  } else if (problem === "DetailDestroyed") {
    after.maxPowerBiasPercent -= powerStep;
    after.minPowerBiasPercent -= powerStep * 0.6;
    after.speedMultiplier += speedStep * 0.75;
    warnings.push("Destroyed detail may be below the material, kerf, and spot-size limit.");
    reason = "Detail destroyed: reduced power bias and raised speed.";
  } else if (problem === "Warping") {
    after.speedMultiplier += speedStep * 0.45;
    after.maxPowerBiasPercent -= powerStep * 0.45;
    warnings.push("Warping also depends on hold-down, fixture, passes, and heat accumulation.");
    reason = "Warping: applied a small heat-reduction correction.";
  } else if (problem === "WrongScale") {
    warnings.push("Wrong scale should be fixed in vector import, units, or controller calibration, not power/speed correction.");
    reason = "Wrong scale feedback recorded without energy correction.";
  }

  after.speedMultiplier = round(clamp(after.speedMultiplier, 0.45, 1.65), 4);
  after.minPowerBiasPercent = round(clamp(after.minPowerBiasPercent, -35, 35), 3);
  after.maxPowerBiasPercent = round(clamp(after.maxPowerBiasPercent, -35, 35), 3);
  after.passBias = clamp(Math.round(after.passBias), -2, 4);
  after.focusBiasMm = round(clamp(after.focusBiasMm, -3, 3), 3);
  after.confidenceScore = input.feedback.wasSuccessful
    ? clamp(after.confidenceScore, 0, 1)
    : clamp(after.confidenceScore + 0.025, 0, 1);
  after.samplesCount = before.samplesCount + 1;
  after.lastFeedbackAt = now;
  after.updatedAt = now;

  const history: CorrectionHistory = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    correctionId: after.id,
    feedbackId: input.feedback.id,
    recommendationId: input.recommendation.id,
    beforeJson: before,
    afterJson: after,
    reason,
    warnings,
    createdAt: now,
  };

  return { correction: after, history, warnings };
}

export function correctionMatchesRecommendation(correction: MachineMaterialCorrection, recommendation: LaserRecommendation): boolean {
  return correction.laserMachineId === recommendation.laserMachineId &&
    correction.materialId === recommendation.materialId &&
    correction.operationType === recommendation.operationType &&
    Math.abs(correction.lensFocalLengthMm - recommendation.machineMotionSnapshotJson.lensFocalLengthMm) < 0.001;
}

export function correctionMatchesPreset(
  correction: MachineMaterialCorrection,
  machineId: string,
  materialId: string,
  operationType: LaserOperationType,
  lensFocalLengthMm: number,
): boolean {
  return correction.laserMachineId === machineId &&
    correction.materialId === materialId &&
    correction.operationType === operationType &&
    Math.abs(correction.lensFocalLengthMm - lensFocalLengthMm) < 0.001;
}

import { LASER_OPERATION_TYPES, LASER_PROBLEM_TYPES, LASER_QUALITY_MODES } from "@/lib/data/lasercoach";
import type {
  LaserJobFeedback,
  LaserMachine,
  LaserMaterial,
  LaserOperationPreset,
  MachineMotionProfile,
  NumericInput,
} from "@/types";
import type { ValidationResult } from "@/lib/validation/spot-validation";

function parseNumber(value: NumericInput, field: string, errors: string[], options: { min?: number; max?: number; nullable?: boolean } = {}): number | null {
  if (options.nullable && (value === null || value === undefined || value === "")) return null;
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a finite number.`);
    return null;
  }
  if (options.min !== undefined && parsed < options.min) errors.push(`${field} must be at least ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) errors.push(`${field} must be at most ${options.max}.`);
  return parsed;
}

function parseString(value: unknown, field: string, errors: string[], nullable = false): string | null {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${field} is required.`);
    return "";
  }
  return value.trim();
}

function timestamps(input: { createdAt?: string; updatedAt?: string }) {
  const now = new Date().toISOString();
  return {
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

export function validateLaserMachine(input: Partial<LaserMachine>): ValidationResult<LaserMachine> {
  const errors: string[] = [];
  const value: LaserMachine = {
    id: parseString(input.id, "id", errors) || `machine-${Date.now()}`,
    ownerUserId: parseString(input.ownerUserId, "ownerUserId", errors) || "local-user",
    name: parseString(input.name, "name", errors) || "",
    controllerType: parseString(input.controllerType, "controllerType", errors) || "Other",
    controllerModel: parseString(input.controllerModel, "controllerModel", errors, true),
    bedWidthMm: parseNumber(input.bedWidthMm, "bedWidthMm", errors, { min: 1 }) || 1,
    bedHeightMm: parseNumber(input.bedHeightMm, "bedHeightMm", errors, { min: 1 }) || 1,
    tubePowerW: parseNumber(input.tubePowerW, "tubePowerW", errors, { min: 1 }) || 1,
    realMeasuredMaxPowerW: parseNumber(input.realMeasuredMaxPowerW, "realMeasuredMaxPowerW", errors, { min: 0, nullable: true }),
    defaultLensFocalLengthMm: parseNumber(input.defaultLensFocalLengthMm, "defaultLensFocalLengthMm", errors, { min: 1 }) || 50.8,
    defaultLensDiameterMm: parseNumber(input.defaultLensDiameterMm, "defaultLensDiameterMm", errors, { min: 1, nullable: true }),
    defaultKerfMm: parseNumber(input.defaultKerfMm, "defaultKerfMm", errors, { min: 0 }) || 0,
    defaultFocusOffsetMm: parseNumber(input.defaultFocusOffsetMm, "defaultFocusOffsetMm", errors) || 0,
    nozzleType: parseString(input.nozzleType, "nozzleType", errors, true),
    airAssistType: parseString(input.airAssistType, "airAssistType", errors, true),
    exhaustNotes: parseString(input.exhaustNotes, "exhaustNotes", errors, true),
    ...timestamps(input),
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export function validateMachineMotionProfile(input: Partial<MachineMotionProfile>): ValidationResult<MachineMotionProfile> {
  const errors: string[] = [];
  const value: MachineMotionProfile = {
    id: parseString(input.id, "id", errors) || `motion-${Date.now()}`,
    laserMachineId: parseString(input.laserMachineId, "laserMachineId", errors) || "",
    profileName: parseString(input.profileName, "profileName", errors) || "",
    maxSpeedMmSec: parseNumber(input.maxSpeedMmSec, "maxSpeedMmSec", errors, { min: 0.1 }) || 0.1,
    maxAccelerationMmSec2: parseNumber(input.maxAccelerationMmSec2, "maxAccelerationMmSec2", errors, { min: 1 }) || 1,
    idleSpeedMmSec: parseNumber(input.idleSpeedMmSec, "idleSpeedMmSec", errors, { min: 0.1 }) || 0.1,
    idleAccelerationMmSec2: parseNumber(input.idleAccelerationMmSec2, "idleAccelerationMmSec2", errors, { min: 1 }) || 1,
    cutAccelerationMmSec2: parseNumber(input.cutAccelerationMmSec2, "cutAccelerationMmSec2", errors, { min: 1 }) || 1,
    scanAccelerationMmSec2: parseNumber(input.scanAccelerationMmSec2, "scanAccelerationMmSec2", errors, { min: 1, nullable: true }),
    engraveAccelerationMmSec2: parseNumber(input.engraveAccelerationMmSec2, "engraveAccelerationMmSec2", errors, { min: 1, nullable: true }),
    jumpOffSpeedMmSec: parseNumber(input.jumpOffSpeedMmSec, "jumpOffSpeedMmSec", errors, { min: 0, nullable: true }),
    startSpeedMmSec: parseNumber(input.startSpeedMmSec, "startSpeedMmSec", errors, { min: 0, nullable: true }),
    cornerSpeedMmSec: parseNumber(input.cornerSpeedMmSec, "cornerSpeedMmSec", errors, { min: 0, nullable: true }),
    accelFactorPercent: parseNumber(input.accelFactorPercent, "accelFactorPercent", errors, { min: 0, max: 200 }) || 0,
    g0AccelFactorPercent: parseNumber(input.g0AccelFactorPercent, "g0AccelFactorPercent", errors, { min: 0, max: 200 }) || 0,
    speedFactorPercent: parseNumber(input.speedFactorPercent, "speedFactorPercent", errors, { min: 0, max: 200 }) || 0,
    source: input.source || "Manual",
    notes: parseString(input.notes, "notes", errors, true),
    isDefault: Boolean(input.isDefault),
    ...timestamps(input),
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export function validateLaserMaterial(input: Partial<LaserMaterial>): ValidationResult<LaserMaterial> {
  const errors: string[] = [];
  const value: LaserMaterial = {
    id: parseString(input.id, "id", errors) || `material-${Date.now()}`,
    name: parseString(input.name, "name", errors) || "",
    family: parseString(input.family, "family", errors) || "Other",
    thicknessMm: parseNumber(input.thicknessMm, "thicknessMm", errors, { min: 0.01 }) || 0.01,
    color: parseString(input.color, "color", errors, true),
    finish: parseString(input.finish, "finish", errors, true),
    supplier: parseString(input.supplier, "supplier", errors, true),
    materialCode: parseString(input.materialCode, "materialCode", errors, true),
    densityHint: parseString(input.densityHint, "densityHint", errors, true),
    ...timestamps(input),
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export function validateLaserOperationPreset(input: Partial<LaserOperationPreset>): ValidationResult<LaserOperationPreset> {
  const errors: string[] = [];
  if (input.operationType && !LASER_OPERATION_TYPES.includes(input.operationType)) errors.push("operationType is not supported.");
  const value: LaserOperationPreset = {
    id: parseString(input.id, "id", errors) || `preset-${Date.now()}`,
    materialId: parseString(input.materialId, "materialId", errors) || "",
    operationType: input.operationType || "Cut",
    lensFocalLengthMm: parseNumber(input.lensFocalLengthMm, "lensFocalLengthMm", errors, { min: 1 }) || 50.8,
    baseSpeedMmSec: parseNumber(input.baseSpeedMmSec, "baseSpeedMmSec", errors, { min: 0.1 }) || 0.1,
    baseMinPowerPercent: parseNumber(input.baseMinPowerPercent, "baseMinPowerPercent", errors, { min: 0, max: 100 }) || 0,
    baseMaxPowerPercent: parseNumber(input.baseMaxPowerPercent, "baseMaxPowerPercent", errors, { min: 0, max: 100 }) || 0,
    passes: parseNumber(input.passes, "passes", errors, { min: 1, max: 20 }) || 1,
    lineIntervalMm: parseNumber(input.lineIntervalMm, "lineIntervalMm", errors, { min: 0.001, nullable: true }),
    dpi: parseNumber(input.dpi, "dpi", errors, { min: 1, nullable: true }),
    airAssist: input.airAssist || "Medium",
    focusOffsetMm: parseNumber(input.focusOffsetMm, "focusOffsetMm", errors) || 0,
    notes: parseString(input.notes, "notes", errors, true),
    ...timestamps(input),
  };
  if (value.baseMinPowerPercent > value.baseMaxPowerPercent) errors.push("baseMinPowerPercent cannot exceed baseMaxPowerPercent.");
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export interface VectorAnalyzeRequest {
  fileName: string;
  svgText: string;
  declaredWidthMm?: number | null;
  declaredHeightMm?: number | null;
  ownerUserId?: string;
  laserMachineId: string;
  motionProfileId: string;
  operationType: string;
  materialId: string;
  lensFocalLengthMm: number;
  desiredQuality: string;
}

export function validateVectorAnalyzeRequest(input: Partial<VectorAnalyzeRequest>): ValidationResult<VectorAnalyzeRequest> {
  const errors: string[] = [];
  if (input.desiredQuality && !LASER_QUALITY_MODES.includes(input.desiredQuality as never)) errors.push("desiredQuality is not supported.");
  const value: VectorAnalyzeRequest = {
    fileName: parseString(input.fileName, "fileName", errors) || "",
    svgText: parseString(input.svgText, "svgText", errors) || "",
    declaredWidthMm: parseNumber(input.declaredWidthMm, "declaredWidthMm", errors, { min: 0.01, nullable: true }),
    declaredHeightMm: parseNumber(input.declaredHeightMm, "declaredHeightMm", errors, { min: 0.01, nullable: true }),
    ownerUserId: parseString(input.ownerUserId, "ownerUserId", errors, true) || "local-user",
    laserMachineId: parseString(input.laserMachineId, "laserMachineId", errors) || "",
    motionProfileId: parseString(input.motionProfileId, "motionProfileId", errors) || "",
    operationType: parseString(input.operationType, "operationType", errors) || "Cut",
    materialId: parseString(input.materialId, "materialId", errors) || "",
    lensFocalLengthMm: parseNumber(input.lensFocalLengthMm, "lensFocalLengthMm", errors, { min: 1 }) || 50.8,
    desiredQuality: parseString(input.desiredQuality, "desiredQuality", errors) || "Balanced",
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export interface RecommendationRequest {
  vectorJobId: string;
  laserMachineId: string;
  motionProfileId: string;
  materialId: string;
  operationPresetId: string;
  vectorAnalysisId: string;
  operationType: string;
  desiredQuality: string;
}

export function validateRecommendationRequest(input: Partial<RecommendationRequest>): ValidationResult<RecommendationRequest> {
  const errors: string[] = [];
  const value: RecommendationRequest = {
    vectorJobId: parseString(input.vectorJobId, "vectorJobId", errors) || "",
    laserMachineId: parseString(input.laserMachineId, "laserMachineId", errors) || "",
    motionProfileId: parseString(input.motionProfileId, "motionProfileId", errors) || "",
    materialId: parseString(input.materialId, "materialId", errors) || "",
    operationPresetId: parseString(input.operationPresetId, "operationPresetId", errors) || "",
    vectorAnalysisId: parseString(input.vectorAnalysisId, "vectorAnalysisId", errors) || "",
    operationType: parseString(input.operationType, "operationType", errors) || "Cut",
    desiredQuality: parseString(input.desiredQuality, "desiredQuality", errors) || "Balanced",
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

export function validateLaserJobFeedback(input: Partial<LaserJobFeedback>): ValidationResult<LaserJobFeedback> {
  const errors: string[] = [];
  if (input.problemType && !LASER_PROBLEM_TYPES.includes(input.problemType as never)) errors.push("problemType is not supported.");
  const value: LaserJobFeedback = {
    id: parseString(input.id, "id", errors) || `feedback-${Date.now()}`,
    recommendationId: parseString(input.recommendationId, "recommendationId", errors) || "",
    ownerUserId: parseString(input.ownerUserId, "ownerUserId", errors) || "local-user",
    wasSuccessful: Boolean(input.wasSuccessful),
    problemType: input.problemType || "None",
    severity: parseNumber(input.severity, "severity", errors, { min: 1, max: 5 }) || 1,
    userComment: parseString(input.userComment, "userComment", errors, true),
    actualSpeedMmSec: parseNumber(input.actualSpeedMmSec, "actualSpeedMmSec", errors, { min: 0.1, nullable: true }),
    actualMinPowerPercent: parseNumber(input.actualMinPowerPercent, "actualMinPowerPercent", errors, { min: 0, max: 100, nullable: true }),
    actualMaxPowerPercent: parseNumber(input.actualMaxPowerPercent, "actualMaxPowerPercent", errors, { min: 0, max: 100, nullable: true }),
    actualPasses: parseNumber(input.actualPasses, "actualPasses", errors, { min: 1, max: 20, nullable: true }),
    actualLineIntervalMm: parseNumber(input.actualLineIntervalMm, "actualLineIntervalMm", errors, { min: 0.001, nullable: true }),
    actualFocusOffsetMm: parseNumber(input.actualFocusOffsetMm, "actualFocusOffsetMm", errors, { nullable: true }),
    actualAirAssist: input.actualAirAssist ?? null,
    resultPhotoPath: parseString(input.resultPhotoPath, "resultPhotoPath", errors, true),
    createdAt: input.createdAt || new Date().toISOString(),
  };
  return { ok: errors.length === 0, value: errors.length ? undefined : value, errors };
}

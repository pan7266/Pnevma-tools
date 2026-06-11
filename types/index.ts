export type Lang = "en" | "el" | "de" | "fr" | "es" | "it" | "tr";
export type UnitSystem = "metric" | "imperial";
export type Theme = "light" | "dark";
export type NumericInput = number | string | null | undefined;

export interface SourcePreset {
  id: string;
  brand: string;
  model: string;
  excitation: "DC" | "RF" | string;
  ratedWatt: number;
  peakWatt?: number;
  maxPowerW?: number;
  beamMm: number;
  tolerance: string;
  m2: number;
  hzDefault: number;
  hzMax: number;
  wavelengthUm: number;
  confidence: string;
  sourceLabel: string;
  sourceUrl: string;
  tubeLengthMm?: number;
  tubeDiameterMm?: number;
  currentBestMa?: number;
  currentBestLabel?: string;
  currentMinMa?: number;
  currentEstimated?: boolean;
}

export interface FinishPreset {
  key: string;
  quality: number;
  thermal: number;
  transmission: number;
  color: string;
  maker?: string;
}

export interface LensPreset {
  factor: number;
  labelKey: string;
}

export interface MirrorPreset {
  label: string;
  reflectivity: number;
  absorption: number;
  thermalCoefficient: number;
}

export type LabelPack = Record<string, string>;

export interface SpotInputs {
  family: "all" | "DC" | "RF" | string;
  sourceId: string;
  manualRatedWatt: NumericInput;
  manualSourceBeamMm: NumericInput;
  manualM2: NumericInput;
  measuredWatt: NumericInput;
  peakWatt: NumericInput;
  powerPercent: NumericInput;
  ampValue: NumericInput;
  ampMeterType: "digital" | "analog" | string;
  hz: NumericInput;
  lensDiameter: NumericInput;
  focalLength: NumericInput;
  lensShape: "meniscus" | "convex" | string;
  finish: "PVD" | "CVD" | "PRO" | string;
  cvdMaker: "generic" | "iivi" | string;
  mirrorFinish: string;
  mirrorDiameter: NumericInput;
  mirrorCount: NumericInput;
  mirrorTempC: NumericInput;
  smokePresent: boolean;
  extractorOn: boolean;
  extractorStrength: "weak" | "normal" | "strong" | string;
  imperfectAlignment: boolean;
  alignmentLossPercent: NumericInput;
  useExpander: boolean;
  expanderMultiplier: NumericInput;
  beamCombinerPosition: "none" | "nearSource" | "beforeFirstMirror" | "firstMirror" | string;
  beamCombinerTransmission: NumericInput;
  beamCombinerDiameter: NumericInput;
}

export interface SpotWarning {
  code: string;
  message: string;
}

export interface SpotGraphData {
  wattCeiling: number;
  selectedWatt: number;
  sourceBeam: number;
  spot: number;
}

export interface SpotResult {
  source: SourcePreset;
  finish: FinishPreset;
  shape: LensPreset;
  mirror: MirrorPreset;
  mirrorCount: number;
  mirrorDiameter: number;
  mirrorClearAperture: number;
  lensDiameter: number;
  focalLength: number;
  hz: number;
  clearAperture: number;
  sourceBeam: number;
  expandedBeam: number;
  expanderMultiplier: number;
  mirrorClipped: boolean;
  lensClipped: boolean;
  clipped: boolean;
  effectiveBeam: number;
  hasMeasuredWatt: boolean;
  hasPeakWatt: boolean;
  exactOrRatedWatt: number;
  powerBaseWatt: number;
  wattBasis: "rated" | "exact" | "peak";
  peakWatt: number | null;
  wattCeiling: number;
  selectedWatt: number;
  opticalSpot: number;
  clippingPenalty: number;
  thermalFactor: number;
  alignmentLoss: number;
  perMirrorReflectivity: number;
  mirrorTransmission: number;
  smokeLoss: number;
  currentMinMa: number | null;
  expectedCurrentMa: number | null;
  atmosphereTransmission: number;
  pathTransmission: number;
  clippingTransmission: number;
  beamCombinerPosition: string;
  beamCombinerTransmission: number;
  beamCombinerLossWatt: number;
  beamCombinerDiameter: number;
  beamCombinerClipped: boolean;
  spot: number;
  deliveredWatt: number;
  mirrorAbsorbedWatt: number;
  atmosphereLostWatt: number;
  alignmentLostWatt: number;
  pulseEnergyMj: number;
  spotTemperatureC: number;
  currentBestMa: number | null;
  hasAmp: boolean;
  ampValue: number;
  ampUpperMa: number;
  ampUncertainty: number;
  wattStressRatio: number;
  stabilityReason: string;
  beamStability: "stable" | "borderline" | "unstable";
  powerDensityWPerMm2: number;
  assumptions: string[];
  opticalStages: SpotOpticalStage[];
  warnings: SpotWarning[];
  graphData: SpotGraphData;
}

export interface SpotOpticalStage {
  id: string;
  labelKey: string;
  kind: "source" | "combiner" | "mirror" | "lens" | "surface";
  beamMm: number;
  energyWatt: number;
  energyPercent: number;
  transmission: number;
  diameterMm?: number;
  finishLabel?: string;
  warning?: boolean;
  assumption?: boolean;
}

export type AxisKey = "x" | "y";
export type ScanMode = "horizontal" | "vertical";
export type DriveType = "belt" | "leadScrew" | "direct" | "controllerOnly";
export type DualMotorMode = "none" | "normalGantry" | "specialRatio";

export interface AxisMechanics {
  motorPresetId?: string;
  secondMotorPresetId?: string;
  driveType: DriveType;
  motorAngle: NumericInput;
  microstepping: NumericInput;
  beltPitch: NumericInput;
  pulleyTeeth: NumericInput;
  screwPitch: NumericInput;
  threadStarts: NumericInput;
  directTravelPerRev: NumericInput;
  controllerStepsPerMm: NumericInput;
  dualMotorMode: DualMotorMode;
  secondMotorAngle: NumericInput;
  secondPulleyTeeth: NumericInput;
  secondMicrostepping: NumericInput;
}

export interface AxisInputs {
  language: Lang;
  theme: Theme;
  unitSystem: UnitSystem;
  scanMode: ScanMode;
  lineInterval: NumericInput;
  dpi: NumericInput;
  spotDiameter: NumericInput;
  liveCalculation: boolean;
  axes: Record<AxisKey, AxisMechanics>;
}

export interface AxisCalc {
  valid: boolean;
  reason?: string;
  controllerOnly?: boolean;
  travelPerRev: number | null;
  fullStepsPerRev: number | null;
  microstepsPerRev: number | null;
  stepsPerMm: number;
  mmPerMicrostep: number;
}

export interface AxisIntervalResult {
  intervalMicrosteps: number;
  nearestMicrosteps: number;
  nearestCleanInterval: number;
  nearestCleanDpi: number;
  errorMm: number;
  errorPercent: number;
  clean: boolean;
}

export interface MotorPreset {
  id: string;
  name: string;
  frameSize: string;
  stepAngleDeg: number;
  fullStepsPerRev: number;
  ratedCurrentA: number | null;
  holdingTorque: string;
  shaftType: string;
  notes: string;
  sourceUrl: string;
  estimated: boolean;
}

export interface AxisSpotResult {
  ratio: number;
  overlap: number;
  statusKey: "spotHighOverlap" | "spotBalanced" | "spotLowOverlap";
  textKey: "spotHighText" | "spotBalancedText" | "spotLowText";
  className: "warn" | "ok";
}

export interface AxisWarning {
  code: string;
  message: string;
}

export interface AxisGraphData {
  requestedX: number;
  nearestX: number;
  currentDpiX: number;
  ticks: number[];
}

export interface AxisResult {
  activeAxisKey: AxisKey;
  activeAxis: AxisMechanics;
  requestedLineInterval: number | null;
  requestedDpi: number | null;
  calc: AxisCalc;
  interval: AxisIntervalResult | null;
  spot: AxisSpotResult | null;
  controller: {
    statusKey: string;
    noteKey: string;
    diffPercent: number | null;
    className: "ok" | "warn" | "";
  };
  dualMotorMessageKey: string;
  graphData: AxisGraphData | null;
  warnings: AxisWarning[];
}

export type KerfMaterialFamily =
  | "cast_acrylic"
  | "xt_acrylic"
  | "mirror_acrylic"
  | "birch_plywood"
  | "ilomba_plywood"
  | "mdf"
  | "paper_cardstock"
  | "leather"
  | "fabric"
  | "nonwoven"
  | "unknown_plastic";

export type KerfOperation =
  | "cut_through"
  | "kiss_cut"
  | "score"
  | "engrave"
  | "photo_engrave"
  | "inlay_precision_fit";

export type KerfQualityGoal =
  | "clean_top_edge"
  | "clean_bottom_exit"
  | "minimum_taper"
  | "minimum_char"
  | "minimum_melting"
  | "polished_acrylic_edge"
  | "best_dimensional_accuracy"
  | "press_fit_accuracy"
  | "fast_production"
  | "safe_mirror_backing";

export type KerfConfidence = "high" | "moderate" | "low";

export type KerfCalibrationMode =
  | "multi_line_strip"
  | "outside_square"
  | "inside_hole"
  | "slot_tab_fit"
  | "inlay_fit"
  | "focus_ladder";

export interface OpticalProfile {
  id: string;
  profileName: string;
  wavelengthUm: number;
  lensFocalLengthMm: number;
  measuredSpotDiameterUm: number;
  measuredSpotDiameterMm: number;
  waistRadiusMm: number;
  rayleighRangeMm: number;
  depthOfFocusMm: number;
  confocalParameterMm: number;
  m2?: number;
  tubePowerW?: number;
  tubeCurrentMa?: number;
  measuredOutputPowerW?: number;
  updatedAt?: string;
}

export interface KerfMaterialPreset {
  id: string;
  labelKey: string;
  family: KerfMaterialFamily;
  subtypes: string[];
  thicknessesMm: number[];
  safetyLevel: "ok" | "warn" | "blocked";
}

export interface KerfAdvisorInputs {
  opticalProfile: OpticalProfile;
  materialId: string;
  family: KerfMaterialFamily;
  subtype?: string;
  thicknessMm: number;
  operation: KerfOperation;
  qualityGoal: KerfQualityGoal;
  airAssist?: "off" | "low" | "medium" | "high";
  extraction?: boolean;
  calibratedKerfMm?: number;
  topKerfMm?: number;
  bottomKerfMm?: number;
  averageKerfMm?: number;
  xAxisKerfMm?: number;
  yAxisKerfMm?: number;
  fitClearanceMm?: number;
  calibrationMode?: KerfCalibrationMode;
  calibration?: {
    designedWidthMm?: number;
    measuredWidthMm?: number;
    numberOfCutLines?: number;
    designedSizeMm?: number;
    measuredOutsideSizeMm?: number;
    designedHoleSizeMm?: number;
    measuredHoleSizeMm?: number;
  };
}

export interface KerfAdvisorResult {
  blocked: boolean;
  recommendedFocusDepthMm: number;
  recommendedFocusPercent: number;
  acceptableFocusMinMm: number;
  acceptableFocusMaxMm: number;
  acceptableFocusMinPercent: number;
  acceptableFocusMaxPercent: number;
  placementLabelKey: string;
  topDiameterMm: number;
  middleDiameterMm: number;
  bottomDiameterMm: number;
  rayleighRangeMm: number;
  confocalParameterMm: number;
  beamSpreadRatio: number;
  opticalSymmetryError: number;
  opticalTaperTendency: "low" | "medium" | "high";
  expectedKerfBehavior: string[];
  expectedBenefits: string[];
  expectedRisks: string[];
  warnings: string[];
  confidence: KerfConfidence;
  confidenceScore: number;
  confidenceExplanation: string;
  recommendedCalibrationTest: string[];
  measuredKerfMm?: number;
  externalContourOffsetMm?: number;
  internalContourOffsetMm?: number;
  lightBurnNotes: string;
}

export type UserMaterialProfile = {
  id: string;
  name: string;
  baseMaterialId: string;
  family: KerfMaterialFamily;
  subtype?: string;
  supplier?: string;
  thicknessMm: number;
  color?: string;
  finish?: string;
  opticalProfileId: string;
  operation: KerfOperation;
  qualityGoal: string;
  recommendedFocusDepthMm: number;
  acceptableFocusMinMm: number;
  acceptableFocusMaxMm: number;
  measuredKerfMm?: number;
  topKerfMm?: number;
  bottomKerfMm?: number;
  averageKerfMm?: number;
  xAxisKerfMm?: number;
  yAxisKerfMm?: number;
  powerPercent?: number;
  tubeCurrentMa?: number;
  speedMmSec?: number;
  passes?: number;
  airAssist?: "off" | "low" | "medium" | "high";
  confidence: KerfConfidence;
  notes?: string[];
  createdAt: string;
  updatedAt: string;
};

export type LaserControllerType = "Ruida" | "Trocen" | "GRBL" | "Smoothieware" | "Other" | string;
export type LaserMotionProfileSource = "Manual" | "LightBurnExport" | "RuidaReadout" | "ImportedJson";
export type LaserMaterialFamily =
  | "CastAcrylic"
  | "XtAcrylic"
  | "MirrorAcrylic"
  | "BirchPlywood"
  | "IlombaPlywood"
  | "Mdf"
  | "PaintedMdf"
  | "Veneer"
  | "Leather"
  | "Fabric"
  | "Other"
  | string;
export type LaserOperationType = "Cut" | "Score" | "LineEngrave" | "FillEngrave" | "PhotoEngrave" | "Mark";
export type LaserAirAssist = "Off" | "Low" | "Medium" | "High" | string;
export type LaserDesiredQuality = "Fast" | "Balanced" | "CleanEdge" | "DeepEngrave" | "FineDetail";
export type LaserFileType = "Svg" | "Dxf" | "Pdf" | "Ai" | "Unknown";
export type LaserGeometryRiskLevel = "Low" | "Medium" | "High";
export type LaserProblemType =
  | "None"
  | "DidNotCutThrough"
  | "AlmostCutThrough"
  | "TooMuchMelting"
  | "BurnedCorners"
  | "SmokeStaining"
  | "EngravingTooLight"
  | "EngravingTooDark"
  | "Banding"
  | "LostSteps"
  | "DetailDestroyed"
  | "ExcessiveCharring"
  | "Warping"
  | "WrongScale"
  | "Other";

export interface LaserMachine {
  id: string;
  ownerUserId: string;
  name: string;
  controllerType: LaserControllerType;
  controllerModel?: string | null;
  bedWidthMm: number;
  bedHeightMm: number;
  tubePowerW: number;
  realMeasuredMaxPowerW?: number | null;
  defaultLensFocalLengthMm: number;
  defaultLensDiameterMm?: number | null;
  defaultKerfMm: number;
  defaultFocusOffsetMm: number;
  nozzleType?: string | null;
  airAssistType?: string | null;
  exhaustNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MachineMotionProfile {
  id: string;
  laserMachineId: string;
  profileName: string;
  maxSpeedMmSec: number;
  maxAccelerationMmSec2: number;
  idleSpeedMmSec: number;
  idleAccelerationMmSec2: number;
  cutAccelerationMmSec2: number;
  scanAccelerationMmSec2?: number | null;
  engraveAccelerationMmSec2?: number | null;
  jumpOffSpeedMmSec?: number | null;
  startSpeedMmSec?: number | null;
  cornerSpeedMmSec?: number | null;
  accelFactorPercent: number;
  g0AccelFactorPercent: number;
  speedFactorPercent: number;
  source: LaserMotionProfileSource;
  notes?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LaserMaterial {
  id: string;
  name: string;
  family: LaserMaterialFamily;
  thicknessMm: number;
  color?: string | null;
  finish?: string | null;
  supplier?: string | null;
  materialCode?: string | null;
  densityHint?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LaserOperationPreset {
  id: string;
  materialId: string;
  operationType: LaserOperationType;
  lensFocalLengthMm: number;
  baseSpeedMmSec: number;
  baseMinPowerPercent: number;
  baseMaxPowerPercent: number;
  passes: number;
  lineIntervalMm?: number | null;
  dpi?: number | null;
  airAssist: LaserAirAssist;
  focusOffsetMm: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VectorJob {
  id: string;
  ownerUserId: string;
  laserMachineId: string;
  motionProfileId: string;
  fileName: string;
  fileType: LaserFileType;
  originalFilePath?: string | null;
  fileBlobReference?: string | null;
  declaredWidthMm: number;
  declaredHeightMm: number;
  detectedWidthMm?: number | null;
  detectedHeightMm?: number | null;
  scaleFactor?: number | null;
  operationType: LaserOperationType;
  materialId: string;
  lensFocalLengthMm: number;
  desiredQuality: LaserDesiredQuality;
  createdAt: string;
  updatedAt: string;
}

export interface VectorAnalysis {
  id: string;
  vectorJobId: string;
  totalCutLengthMm: number;
  totalScoreLengthMm?: number | null;
  estimatedEngraveAreaMm2?: number | null;
  pathCount: number;
  openPathCount: number;
  closedPathCount: number;
  duplicateLineCount: number;
  tinyFeatureCount: number;
  smallestFeatureMm?: number | null;
  smallestGapMm?: number | null;
  sharpCornerCount: number;
  curveSegmentCount: number;
  boundingBoxWidthMm: number;
  boundingBoxHeightMm: number;
  hasUnsupportedElements: boolean;
  warningsJson: string[];
  createdAt: string;
}

export interface LaserMachineMotionSnapshot {
  maxSpeedMmSec: number;
  maxAccelerationMmSec2: number;
  idleSpeedMmSec: number;
  idleAccelerationMmSec2: number;
  cutAccelerationMmSec2: number;
  scanAccelerationMmSec2?: number | null;
  engraveAccelerationMmSec2?: number | null;
  jumpOffSpeedMmSec?: number | null;
  startSpeedMmSec?: number | null;
  cornerSpeedMmSec?: number | null;
  accelFactorPercent: number;
  g0AccelFactorPercent: number;
  speedFactorPercent: number;
  controllerType: LaserControllerType;
  controllerModel?: string | null;
  bedWidthMm: number;
  bedHeightMm: number;
  tubePowerW: number;
  realMeasuredMaxPowerW?: number | null;
  lensFocalLengthMm: number;
  lensDiameterMm?: number | null;
  nozzleType?: string | null;
  airAssistType?: string | null;
  exhaustNotes?: string | null;
  kerfMm: number;
  defaultFocusOffsetMm: number;
}

export interface LaserRecommendation {
  id: string;
  vectorJobId: string;
  laserMachineId: string;
  motionProfileId: string;
  materialId: string;
  operationType: LaserOperationType;
  recommendedSpeedMmSec: number;
  recommendedMinPowerPercent: number;
  recommendedMaxPowerPercent: number;
  recommendedPasses: number;
  recommendedLineIntervalMm?: number | null;
  recommendedDpi?: number | null;
  recommendedFocusOffsetMm: number;
  recommendedAirAssist: LaserAirAssist;
  estimatedTimeSeconds?: number | null;
  geometryRiskLevel: LaserGeometryRiskLevel;
  recommendationReasoningJson: {
    baseSpeedMmSec: number;
    correctionSpeedMultiplier: number;
    geometrySpeedMultiplier: number;
    desiredQualityMultiplier: number;
    geometryPowerBiasPercent: number;
    geometryPassBias: number;
    operationSpeedLimitMmSec: number;
    warnings: string[];
  };
  machineMotionSnapshotJson: LaserMachineMotionSnapshot;
  createdAt: string;
}

export interface LaserJobFeedback {
  id: string;
  recommendationId: string;
  ownerUserId: string;
  wasSuccessful: boolean;
  problemType: LaserProblemType;
  severity: number;
  userComment?: string | null;
  actualSpeedMmSec?: number | null;
  actualMinPowerPercent?: number | null;
  actualMaxPowerPercent?: number | null;
  actualPasses?: number | null;
  actualLineIntervalMm?: number | null;
  actualFocusOffsetMm?: number | null;
  actualAirAssist?: LaserAirAssist | null;
  resultPhotoPath?: string | null;
  createdAt: string;
}

export interface MachineMaterialCorrection {
  id: string;
  laserMachineId: string;
  materialId: string;
  operationType: LaserOperationType;
  lensFocalLengthMm: number;
  speedMultiplier: number;
  minPowerBiasPercent: number;
  maxPowerBiasPercent: number;
  passBias: number;
  focusBiasMm: number;
  lineIntervalMultiplier?: number | null;
  confidenceScore: number;
  samplesCount: number;
  lastFeedbackAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorrectionHistory {
  id: string;
  correctionId: string;
  feedbackId: string;
  recommendationId: string;
  beforeJson: MachineMaterialCorrection;
  afterJson: MachineMaterialCorrection;
  reason: string;
  warnings: string[];
  createdAt: string;
}

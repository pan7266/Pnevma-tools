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

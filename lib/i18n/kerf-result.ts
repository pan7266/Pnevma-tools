import type { KerfAdvisorInputs, KerfAdvisorResult } from "@/types";

const PHRASE_KEYS: Record<string, string> = {
  "Species-specific calibration required.": "noteSpeciesCalibration",
  "Focus is less critical than hold-down, air assist, and scorching control.": "notePaperFocus",
  "Identify tanning and finish first.": "noteLeatherIdentify",
  "Swatch test mandatory.": "noteSwatchMandatory",
  "Swatch and odor test mandatory.": "noteSwatchOdorMandatory",
  "Thickness is outside the preset table; nearest preset was adapted.": "noteNearestPreset",
  "Keep energy near the entry face.": "noteEntryFaceEnergy",
  "Use -0.5 to -1.0 mm for a wider visible score.": "noteWiderScore",
  "Defocus only when smoother fill is more important than sharpness.": "noteSmoothFill",
  "Defocus reduces detail but can smooth tonal fill.": "notePhotoFill",
  "Watch flame, haze, boiling, and extraction on polished acrylic edges.": "notePolishedAcrylic",
  "Kerf calibration controls fit more than focus theory.": "noteKerfControlsFit",
  "Speed and power changes can invalidate kerf calibration.": "noteProductionInvalidates",
  "Mirror backing needs a scrap test and shallow focus bias.": "noteMirrorBacking",
  "Surface chemistry may dominate focus behavior. Run coating scrap test before production.": "noteSurfaceChemistry",
  "Material identity is unknown. Do not laser cut until the material is confirmed safe by SDS or supplier documentation.": "warningUnknownMaterialRisk",
  "Never let focus optimization make unsafe materials seem safe.": "warningUnsafeFocus",
  "Treat mirror acrylic separately from normal acrylic.": "warningMirrorAcrylicSeparate",
  "Do not reuse plain PMMA kerf blindly.": "warningPlainPmmaKerf",
  "Backing / coating can dominate the result and too much heat can damage it.": "warningMirrorBackingDamage",
  "MDF and plywood need sufficient extraction.": "warningMdfPlywoodExtraction",
  "Chrome-tanned or unknown leather can be unsafe. Confirm tanning first.": "warningLeatherTanning",
  "Unknown coated or synthetic fabrics require SDS/supplier confirmation.": "warningFabricSds",
  "Acrylic cutting needs supervision and extraction.": "warningAcrylicSupervision",
  "Measured kerf is tapered. Use the face that controls your assembly as the reference.": "warningTaperedKerf",
  "Beam diameter is an optical indicator only. Actual kerf depends on material absorption, melting, plume shielding, air assist, extraction, resin, density, backing films, lens cleanliness, alignment, and beam quality.": "behaviorOpticalIndicator",
  "Bottom optical diameter trends wider than the top at this focus.": "behaviorBottomWider",
  "Top and bottom optical diameters are relatively balanced at this focus.": "behaviorBalanced",
  "Use the recommendation as the first ladder test, not as final production proof.": "benefitFirstLadder",
  "Inlay and press-fit work require measured top, bottom, and average kerf.": "riskInlayKerf",
  "Material is blocked until identity and safety are confirmed.": "confidenceBlocked",
};

type Labels = Record<string, string>;

export function translateKerfPhrase(value: string, labels: Labels): string {
  const key = PHRASE_KEYS[value];
  return key ? labels[key] || value : value;
}

export function translateKerfList(values: string[], labels: Labels): string[] {
  return values.map((value) => translateKerfPhrase(value, labels));
}

export function localizedConfidenceExplanation(result: KerfAdvisorResult, labels: Labels): string {
  if (result.blocked) return labels.confidenceBlocked || result.confidenceExplanation;
  return (labels.confidenceWeighted || result.confidenceExplanation).replace("{confidence}", labels[result.confidence] || result.confidence);
}

function localizeCalibrationItem(value: string, labels: Labels): string {
  if (value === "top surface") return labels.ladderTopSurface || value;
  if (value === "upper third") return labels.ladderUpperThird || value;
  return value;
}

function optionalNumber(value: number | undefined, labels: Labels): string {
  return value === undefined ? labels.notMeasured : String(value);
}

export function buildLocalizedLightBurnNotes(result: KerfAdvisorResult, inputs: KerfAdvisorInputs, labels: Labels): string {
  const measuredKerf = result.measuredKerfMm;
  const externalOffset = result.externalContourOffsetMm;
  const internalOffset = result.internalContourOffsetMm;
  const warnings = translateKerfList(result.warnings, labels).join(" | ") || labels.none;
  const calibration = result.recommendedCalibrationTest.map((item) => localizeCalibrationItem(item, labels)).join(", ");

  return [
    `${labels.material}: ${inputs.materialId}`,
    `${labels.subtype}: ${inputs.subtype || labels.notSpecified}`,
    `${labels.thickness}: ${inputs.thicknessMm} mm`,
    `${labels.operation}: ${labels[inputs.operation] || inputs.operation}`,
    `${labels.qualityGoal}: ${labels[inputs.qualityGoal] || inputs.qualityGoal}`,
    `${labels.opticalProfile}: ${inputs.opticalProfile.profileName}`,
    `${labels.lensFocalLength}: ${inputs.opticalProfile.lensFocalLengthMm} mm`,
    `${labels.measuredSpot}: ${inputs.opticalProfile.measuredSpotDiameterMm} mm`,
    `M2: ${inputs.opticalProfile.m2 || labels.notSpecified}`,
    `${labels.rayleigh}: ${result.rayleighRangeMm.toFixed(2)} mm`,
    `${labels.depthOfFocusConfocal}: ${result.confocalParameterMm.toFixed(2)} mm`,
    `${labels.recommendedFocusDepth}: ${result.recommendedFocusDepthMm.toFixed(2)} mm (${result.recommendedFocusPercent.toFixed(1)}%)`,
    `${labels.acceptableFocusRange}: ${result.acceptableFocusMinMm.toFixed(2)} - ${result.acceptableFocusMaxMm.toFixed(2)} mm`,
    `${labels.placement}: ${labels[result.placementLabelKey] || result.placementLabelKey}`,
    `${labels.measuredKerf}: ${measuredKerf ? `${measuredKerf.toFixed(2)} mm` : labels.notMeasured}`,
    `${labels.topKerf}: ${optionalNumber(inputs.topKerfMm, labels)}`,
    `${labels.bottomKerf}: ${optionalNumber(inputs.bottomKerfMm, labels)}`,
    `${labels.averageKerf}: ${inputs.averageKerfMm || measuredKerf || labels.notMeasured}`,
    `${labels.xKerf}: ${optionalNumber(inputs.xAxisKerfMm, labels)}`,
    `${labels.yKerf}: ${optionalNumber(inputs.yAxisKerfMm, labels)}`,
    `${labels.externalOffset}: ${externalOffset ? `${externalOffset.toFixed(2)} mm ${labels.outward}` : labels.measureKerfFirst}`,
    `${labels.internalOffset}: ${internalOffset ? `${internalOffset.toFixed(2)} mm ${labels.inward}` : labels.measureKerfFirst}`,
    labels.slotTabNote,
    `${labels.recommendedCalibrationPattern}: ${calibration}`,
    `${labels.warnings}: ${warnings}`,
    `${labels.confidenceScore}: ${result.confidenceScore.toFixed(0)} / 100`,
  ].join("\n");
}

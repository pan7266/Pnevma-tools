import type { KerfAdvisorInputs, KerfAdvisorResult, KerfConfidence, KerfMaterialFamily } from "@/types";

export const LAMBDA_MM = 10.6e-3;

export function waistRadiusMmFromSpotDiameter(spotDiameterMm: number): number {
  return spotDiameterMm / 2;
}

export function rayleighRangeMm(
  waistRadiusMm: number,
  wavelengthMm: number = LAMBDA_MM,
  m2: number = 1,
): number {
  return Math.PI * waistRadiusMm * waistRadiusMm / (m2 * wavelengthMm);
}

export function confocalParameterMm(zRmm: number): number {
  return 2 * zRmm;
}

export function beamRadiusAtDepthMm(
  yMm: number,
  focusDepthMm: number,
  waistRadiusMm: number,
  zRmm: number,
): number {
  const z = yMm - focusDepthMm;
  return waistRadiusMm * Math.sqrt(1 + (z / zRmm) ** 2);
}

export function beamDiameterAtDepthMm(
  yMm: number,
  focusDepthMm: number,
  waistRadiusMm: number,
  zRmm: number,
): number {
  return 2 * beamRadiusAtDepthMm(yMm, focusDepthMm, waistRadiusMm, zRmm);
}

export function beamDiametersInMaterial(
  thicknessMm: number,
  focusDepthMm: number,
  spotDiameterMm: number,
  wavelengthMm: number = LAMBDA_MM,
  m2: number = 1,
) {
  const w0 = waistRadiusMmFromSpotDiameter(spotDiameterMm);
  const zR = rayleighRangeMm(w0, wavelengthMm, m2);

  const top = beamDiameterAtDepthMm(0, focusDepthMm, w0, zR);
  const middle = beamDiameterAtDepthMm(thicknessMm / 2, focusDepthMm, w0, zR);
  const bottom = beamDiameterAtDepthMm(thicknessMm, focusDepthMm, w0, zR);

  return {
    top,
    middle,
    bottom,
    zR,
    confocal: 2 * zR,
  };
}

export function opticalSymmetryError(
  topDiameterMm: number,
  bottomDiameterMm: number,
  middleDiameterMm: number,
): number {
  return Math.abs(topDiameterMm - bottomDiameterMm) / middleDiameterMm;
}

export function beamSpreadRatio(
  topDiameterMm: number,
  bottomDiameterMm: number,
): number {
  return bottomDiameterMm / topDiameterMm;
}

export function divergenceHalfAngleRad(
  waistRadiusMm: number,
  wavelengthMm: number = LAMBDA_MM,
  m2: number = 1,
): number {
  return (m2 * wavelengthMm) / (Math.PI * waistRadiusMm);
}

type PresetRule = {
  focus: number;
  min: number;
  max: number;
  placement: string;
  confidence: "high" | "high-moderate" | "moderate-high" | "moderate" | "low-moderate" | "medium-low";
  notes?: string[];
};

const RULES: Partial<Record<KerfMaterialFamily, Record<number, PresetRule>>> = {
  cast_acrylic: {
    2: { focus: 0, min: 0, max: 0.3, placement: "placementTop", confidence: "high-moderate" },
    3: { focus: 0.5, min: 0, max: 0.8, placement: "placementTopUpper", confidence: "moderate" },
    5: { focus: 1.2, min: 0, max: 2, placement: "placementUpperThird", confidence: "moderate" },
    6: { focus: 2, min: 1.2, max: 2.5, placement: "placementUpperThird", confidence: "high" },
    8: { focus: 2.7, min: 1.8, max: 3.5, placement: "placementUpperThird", confidence: "high-moderate" },
    10: { focus: 3.3, min: 2.2, max: 4.2, placement: "placementUpperThird", confidence: "high-moderate" },
  },
  xt_acrylic: {
    2: { focus: 0, min: 0, max: 0.3, placement: "placementTop", confidence: "moderate" },
    3: { focus: 0.3, min: 0, max: 0.8, placement: "placementTopUpper", confidence: "moderate" },
    5: { focus: 1, min: 0, max: 2, placement: "placementUpperThird", confidence: "moderate" },
    6: { focus: 2, min: 1, max: 2.5, placement: "placementUpperThird", confidence: "high-moderate" },
  },
  mirror_acrylic: {
    2: { focus: 0, min: 0, max: 0.3, placement: "placementTop", confidence: "medium-low" },
    3: { focus: 0.3, min: 0, max: 0.8, placement: "placementTopUpper", confidence: "medium-low" },
  },
  birch_plywood: {
    3: { focus: 0.9, min: 0.4, max: 1.2, placement: "placementUpperThird", confidence: "moderate" },
    5: { focus: 1.3, min: 0.6, max: 2, placement: "placementUpperThird", confidence: "moderate" },
    8: { focus: 2.2, min: 1, max: 3.5, placement: "placementUpperMiddle", confidence: "moderate" },
  },
  ilomba_plywood: {
    4: { focus: 1, min: 0.4, max: 1.6, placement: "placementUpperThird", confidence: "low-moderate", notes: ["Species-specific calibration required."] },
  },
  mdf: {
    3: { focus: 0.6, min: 0.2, max: 1, placement: "placementTopUpper", confidence: "moderate" },
    4: { focus: 0.8, min: 0.3, max: 1.2, placement: "placementUpperThird", confidence: "moderate-high" },
    5: { focus: 1.1, min: 0.4, max: 1.8, placement: "placementUpperThird", confidence: "moderate" },
    8: { focus: 2.2, min: 0.8, max: 3.2, placement: "placementUpperThird", confidence: "moderate" },
    9: { focus: 2.5, min: 0.5, max: 3.5, placement: "placementUpperThird", confidence: "moderate" },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function confidenceToBase(confidence: PresetRule["confidence"]): { label: KerfConfidence; score: number } {
  if (confidence === "high") return { label: "high", score: 88 };
  if (confidence === "high-moderate" || confidence === "moderate-high") return { label: "moderate", score: 76 };
  if (confidence === "moderate") return { label: "moderate", score: 66 };
  return { label: "low", score: 48 };
}

function degrade(confidence: KerfConfidence): KerfConfidence {
  if (confidence === "high") return "moderate";
  if (confidence === "moderate") return "low";
  return "low";
}

function getNearestRule(family: KerfMaterialFamily, thicknessMm: number): PresetRule {
  if (family === "paper_cardstock") return { focus: 0, min: -0.3, max: 0.3, placement: "placementTop", confidence: "moderate", notes: ["Focus is less critical than hold-down, air assist, and scorching control."] };
  if (family === "leather") return { focus: 0, min: -0.5, max: 0.5, placement: "placementTop", confidence: "low-moderate", notes: ["Identify tanning and finish first."] };
  if (family === "fabric") return { focus: 0, min: -0.5, max: 0.5, placement: "placementTop", confidence: "low-moderate", notes: ["Swatch test mandatory."] };
  if (family === "nonwoven") return { focus: 0, min: -0.5, max: 0.5, placement: "placementTop", confidence: "low-moderate", notes: ["Swatch and odor test mandatory."] };
  const table = RULES[family] || RULES.mdf || {};
  const exact = table[thicknessMm];
  if (exact) return exact;
  const nearest = Object.keys(table).map(Number).sort((a, b) => Math.abs(a - thicknessMm) - Math.abs(b - thicknessMm))[0];
  const rule = table[nearest] || { focus: thicknessMm * 0.25, min: 0, max: thicknessMm * 0.5, placement: "placementUpperThird", confidence: "low-moderate" as const };
  return { ...rule, confidence: "low-moderate", notes: [...(rule.notes || []), "Thickness is outside the preset table; nearest preset was adapted."] };
}

function applyOperation(rule: PresetRule, inputs: KerfAdvisorInputs): PresetRule {
  if (inputs.operation === "kiss_cut") return { focus: -0.15, min: -0.3, max: 0, placement: "placementAboveTop", confidence: "moderate", notes: ["Keep energy near the entry face."] };
  if (inputs.operation === "score") return { focus: 0, min: -1, max: 0, placement: "placementTop", confidence: "moderate", notes: ["Use -0.5 to -1.0 mm for a wider visible score."] };
  if (inputs.operation === "engrave") return { focus: 0, min: -1, max: 0, placement: "placementTop", confidence: "moderate", notes: ["Defocus only when smoother fill is more important than sharpness."] };
  if (inputs.operation === "photo_engrave") return { focus: 0, min: -1.5, max: 0, placement: "placementTop", confidence: "moderate", notes: ["Defocus reduces detail but can smooth tonal fill."] };
  return rule;
}

function applyQuality(rule: PresetRule, inputs: KerfAdvisorInputs): PresetRule {
  const span = rule.max - rule.min;
  let focus = rule.focus;
  const notes = [...(rule.notes || [])];
  if (inputs.qualityGoal === "clean_top_edge" || inputs.qualityGoal === "minimum_char" || inputs.qualityGoal === "minimum_melting" || inputs.qualityGoal === "safe_mirror_backing") {
    focus = Math.min(focus, rule.min + span * 0.28);
  }
  if (inputs.qualityGoal === "clean_bottom_exit") focus = Math.max(focus, rule.min + span * 0.72);
  if (inputs.qualityGoal === "minimum_taper") focus = clamp(inputs.thicknessMm * 0.5, rule.min, rule.max);
  if (inputs.qualityGoal === "polished_acrylic_edge" && inputs.thicknessMm >= 6) {
    focus = clamp(inputs.thicknessMm * 0.33, rule.min, rule.max);
    notes.push("Watch flame, haze, boiling, and extraction on polished acrylic edges.");
  }
  if (inputs.qualityGoal === "best_dimensional_accuracy" || inputs.qualityGoal === "press_fit_accuracy") notes.push("Kerf calibration controls fit more than focus theory.");
  if (inputs.qualityGoal === "fast_production") notes.push("Speed and power changes can invalidate kerf calibration.");
  if (inputs.qualityGoal === "safe_mirror_backing") notes.push("Mirror backing needs a scrap test and shallow focus bias.");
  return { ...rule, focus, notes };
}

function calculateKerf(inputs: KerfAdvisorInputs): number | undefined {
  const c = inputs.calibration;
  if (!c) return inputs.calibratedKerfMm || inputs.averageKerfMm;
  if (inputs.calibrationMode === "multi_line_strip" && c.designedWidthMm && c.measuredWidthMm && c.numberOfCutLines) {
    return (c.designedWidthMm - c.measuredWidthMm) / c.numberOfCutLines;
  }
  if (inputs.calibrationMode === "outside_square" && c.designedSizeMm && c.measuredOutsideSizeMm) {
    return c.designedSizeMm - c.measuredOutsideSizeMm;
  }
  if (inputs.calibrationMode === "inside_hole" && c.designedHoleSizeMm && c.measuredHoleSizeMm) {
    return c.measuredHoleSizeMm - c.designedHoleSizeMm;
  }
  return inputs.calibratedKerfMm || inputs.averageKerfMm;
}

export function calculateKerfAdvisor(inputs: KerfAdvisorInputs): KerfAdvisorResult {
  const warnings: string[] = [];
  const risks: string[] = [];
  const benefits: string[] = [];
  const behavior: string[] = [];
  if (inputs.family === "unknown_plastic") {
    return {
      blocked: true,
      recommendedFocusDepthMm: 0,
      recommendedFocusPercent: 0,
      acceptableFocusMinMm: 0,
      acceptableFocusMaxMm: 0,
      acceptableFocusMinPercent: 0,
      acceptableFocusMaxPercent: 0,
      placementLabelKey: "placementBlocked",
      topDiameterMm: 0,
      middleDiameterMm: 0,
      bottomDiameterMm: 0,
      rayleighRangeMm: 0,
      confocalParameterMm: 0,
      beamSpreadRatio: 0,
      opticalSymmetryError: 0,
      opticalTaperTendency: "high",
      expectedKerfBehavior: [],
      expectedBenefits: [],
      expectedRisks: ["Material identity is unknown. Do not laser cut until the material is confirmed safe by SDS or supplier documentation."],
      warnings: ["Never let focus optimization make unsafe materials seem safe."],
      confidence: "low",
      confidenceScore: 0,
      confidenceExplanation: "Material is blocked until identity and safety are confirmed.",
      recommendedCalibrationTest: [],
      lightBurnNotes: "Material identity is unknown. Do not laser cut until the material is confirmed safe by SDS or supplier documentation.",
    };
  }

  let rule = getNearestRule(inputs.family, inputs.thicknessMm);
  rule = applyQuality(applyOperation(rule, inputs), inputs);
  if (["painted_mdf", "printed_mdf", "black_mdf", "white_mdf"].includes(inputs.subtype || "")) {
    rule = { ...rule, confidence: "low-moderate", notes: [...(rule.notes || []), "Surface chemistry may dominate focus behavior. Run coating scrap test before production."] };
  }
  if (inputs.family === "mirror_acrylic") {
    warnings.push("Treat mirror acrylic separately from normal acrylic.");
    warnings.push("Do not reuse plain PMMA kerf blindly.");
    warnings.push("Backing / coating can dominate the result and too much heat can damage it.");
  }
  if ((inputs.family === "mdf" || inputs.family.includes("plywood")) && inputs.extraction === false) warnings.push("MDF and plywood need sufficient extraction.");
  if (inputs.family === "leather") warnings.push("Chrome-tanned or unknown leather can be unsafe. Confirm tanning first.");
  if (inputs.family === "fabric" || inputs.family === "nonwoven") warnings.push("Unknown coated or synthetic fabrics require SDS/supplier confirmation.");
  if (inputs.family.includes("acrylic")) warnings.push("Acrylic cutting needs supervision and extraction.");

  const m2 = inputs.opticalProfile.m2 || 1;
  const wavelengthMm = inputs.opticalProfile.wavelengthUm ? inputs.opticalProfile.wavelengthUm / 1000 : LAMBDA_MM;
  const beam = beamDiametersInMaterial(inputs.thicknessMm, rule.focus, inputs.opticalProfile.measuredSpotDiameterMm, wavelengthMm, m2);
  const symmetry = opticalSymmetryError(beam.top, beam.bottom, beam.middle);
  const spread = beamSpreadRatio(beam.top, beam.bottom);
  const taper = symmetry < 0.18 ? "low" : symmetry < 0.45 ? "medium" : "high";
  const kerf = calculateKerf(inputs);
  const base = confidenceToBase(rule.confidence);
  let confidence = base.label;
  let score = base.score;
  if (kerf) score += 10;
  if (inputs.topKerfMm && inputs.bottomKerfMm) score += 8;
  if (!inputs.opticalProfile.id) score -= 14;
  if (inputs.qualityGoal === "fast_production" && !kerf) score -= 10;
  if (warnings.length > 2) score -= 8;
  score = clamp(score, 0, 96);
  if (score >= 80) confidence = "high";
  else if (score >= 58) confidence = "moderate";
  else confidence = "low";
  if (inputs.topKerfMm && inputs.bottomKerfMm && Math.abs(inputs.topKerfMm - inputs.bottomKerfMm) > Math.max(0.04, (kerf || 0.1) * 0.25)) {
    warnings.push("Measured kerf is tapered. Use the face that controls your assembly as the reference.");
    confidence = degrade(confidence);
  }

  behavior.push("Beam diameter is an optical indicator only. Actual kerf depends on material absorption, melting, plume shielding, air assist, extraction, resin, density, backing films, lens cleanliness, alignment, and beam quality.");
  behavior.push(spread > 1 ? "Bottom optical diameter trends wider than the top at this focus." : "Top and bottom optical diameters are relatively balanced at this focus.");
  benefits.push("Use the recommendation as the first ladder test, not as final production proof.");
  risks.push(...(rule.notes || []));
  if (inputs.operation === "inlay_precision_fit") risks.push("Inlay and press-fit work require measured top, bottom, and average kerf.");

  const ladder = ["0%", "15%", "30%", "50%", "70%"];
  if (inputs.family.includes("acrylic") && inputs.thicknessMm > 6) ladder.splice(2, 0, "33%");
  if (inputs.family === "mdf" || inputs.family.includes("plywood")) ladder.push("top surface", "upper third");
  const externalOffset = kerf ? kerf / 2 : undefined;
  const internalOffset = kerf ? kerf / 2 : undefined;
  const percent = inputs.thicknessMm > 0 ? (rule.focus / inputs.thicknessMm) * 100 : 0;
  const minPercent = inputs.thicknessMm > 0 ? (rule.min / inputs.thicknessMm) * 100 : 0;
  const maxPercent = inputs.thicknessMm > 0 ? (rule.max / inputs.thicknessMm) * 100 : 0;
  const lightBurnNotes = [
    `Material: ${inputs.materialId}`,
    `Subtype: ${inputs.subtype || "not specified"}`,
    `Thickness: ${inputs.thicknessMm} mm`,
    `Operation: ${inputs.operation}`,
    `Quality goal: ${inputs.qualityGoal}`,
    `Optical profile: ${inputs.opticalProfile.profileName}`,
    `Lens focal length: ${inputs.opticalProfile.lensFocalLengthMm} mm`,
    `Measured spot: ${inputs.opticalProfile.measuredSpotDiameterMm} mm`,
    `M2: ${inputs.opticalProfile.m2 || "not specified"}`,
    `Rayleigh range: ${beam.zR.toFixed(2)} mm`,
    `Depth of focus / confocal: ${beam.confocal.toFixed(2)} mm`,
    `Recommended focus depth: ${rule.focus.toFixed(2)} mm (${percent.toFixed(1)}%)`,
    `Acceptable focus range: ${rule.min.toFixed(2)} to ${rule.max.toFixed(2)} mm`,
    `Placement label: ${rule.placement}`,
    `Measured kerf: ${kerf ? `${kerf.toFixed(2)} mm` : "not measured"}`,
    `Top kerf: ${inputs.topKerfMm || "not measured"}`,
    `Bottom kerf: ${inputs.bottomKerfMm || "not measured"}`,
    `Average kerf: ${inputs.averageKerfMm || kerf || "not measured"}`,
    `X kerf: ${inputs.xAxisKerfMm || "not measured"}`,
    `Y kerf: ${inputs.yAxisKerfMm || "not measured"}`,
    `External contour offset: ${externalOffset ? `${externalOffset.toFixed(2)} mm outward` : "measure kerf first"}`,
    `Internal contour offset: ${internalOffset ? `${internalOffset.toFixed(2)} mm inward` : "measure kerf first"}`,
    "Slot/tab note: slot actual size tends to become designed slot + kerf; tab actual size tends to become designed tab - kerf.",
    `Recommended calibration pattern: ${ladder.join(", ")}`,
    `Warnings: ${warnings.join(" | ") || "none"}`,
    `Confidence score: ${score.toFixed(0)} / 100`,
  ].join("\n");

  return {
    blocked: false,
    recommendedFocusDepthMm: rule.focus,
    recommendedFocusPercent: percent,
    acceptableFocusMinMm: rule.min,
    acceptableFocusMaxMm: rule.max,
    acceptableFocusMinPercent: minPercent,
    acceptableFocusMaxPercent: maxPercent,
    placementLabelKey: rule.placement,
    topDiameterMm: beam.top,
    middleDiameterMm: beam.middle,
    bottomDiameterMm: beam.bottom,
    rayleighRangeMm: beam.zR,
    confocalParameterMm: beam.confocal,
    beamSpreadRatio: spread,
    opticalSymmetryError: symmetry,
    opticalTaperTendency: taper,
    expectedKerfBehavior: behavior,
    expectedBenefits: benefits,
    expectedRisks: risks,
    warnings,
    confidence,
    confidenceScore: score,
    confidenceExplanation: `${confidence} confidence: preset match, optical profile, material risk, and kerf calibration were weighted together.`,
    recommendedCalibrationTest: ladder,
    measuredKerfMm: kerf,
    externalContourOffsetMm: externalOffset,
    internalContourOffsetMm: internalOffset,
    lightBurnNotes,
  };
}

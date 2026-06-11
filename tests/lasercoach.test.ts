import { describe, expect, it } from "vitest";
import { createLaserRecommendation, processLaserJobFeedback } from "@/lib/calculators/lasercoach";
import { analyzeSvgVector, sanitizeSvgForAnalysis } from "@/lib/calculators/lasercoach-svg";
import { createDefaultCorrection, DEFAULT_LASER_MACHINE, DEFAULT_MACHINE_MOTION_PROFILE, LASER_MATERIAL_SEEDS, LASER_OPERATION_PRESET_SEEDS } from "@/lib/data/lasercoach";
import type { LaserJobFeedback, MachineMaterialCorrection, MachineMotionProfile, VectorAnalysis } from "@/types";

const material = LASER_MATERIAL_SEEDS.find((item) => item.id === "mat-cast-acrylic-3-clear")!;
const preset = LASER_OPERATION_PRESET_SEEDS.find((item) => item.id === "preset-cast-acrylic-3-cut")!;

function baseAnalysis(overrides: Partial<VectorAnalysis> = {}): VectorAnalysis {
  return {
    id: "analysis-test",
    vectorJobId: "job-test",
    totalCutLengthMm: 200,
    totalScoreLengthMm: null,
    estimatedEngraveAreaMm2: null,
    pathCount: 2,
    openPathCount: 0,
    closedPathCount: 2,
    duplicateLineCount: 0,
    tinyFeatureCount: 0,
    smallestFeatureMm: 10,
    smallestGapMm: 5,
    sharpCornerCount: 2,
    curveSegmentCount: 0,
    boundingBoxWidthMm: 50,
    boundingBoxHeightMm: 40,
    hasUnsupportedElements: false,
    warningsJson: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function recommendation(correction?: MachineMaterialCorrection, profile: MachineMotionProfile = DEFAULT_MACHINE_MOTION_PROFILE) {
  return createLaserRecommendation({
    vectorJobId: "job-test",
    machine: DEFAULT_LASER_MACHINE,
    motionProfile: profile,
    material,
    preset,
    analysis: baseAnalysis(),
    correction,
    operationType: "Cut",
    desiredQuality: "Balanced",
    now: "2026-01-01T00:00:00.000Z",
  });
}

function feedback(problemType: LaserJobFeedback["problemType"], severity: number, recommendationId = "rec-test"): LaserJobFeedback {
  return {
    id: `feedback-${problemType}-${severity}`,
    recommendationId,
    ownerUserId: "local-user",
    wasSuccessful: problemType === "None",
    problemType,
    severity,
    userComment: null,
    actualSpeedMmSec: null,
    actualMinPowerPercent: null,
    actualMaxPowerPercent: null,
    actualPasses: null,
    actualLineIntervalMm: null,
    actualFocusOffsetMm: null,
    actualAirAssist: null,
    resultPhotoPath: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("LaserCoach recommendation engine", () => {
  it("applies preset, correction, geometry, and quality multipliers deterministically", () => {
    const correction = createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm);
    correction.speedMultiplier = 0.8;

    const result = createLaserRecommendation({
      vectorJobId: "job-test",
      machine: DEFAULT_LASER_MACHINE,
      motionProfile: DEFAULT_MACHINE_MOTION_PROFILE,
      material,
      preset,
      analysis: baseAnalysis(),
      correction,
      operationType: "Cut",
      desiredQuality: "CleanEdge",
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(result.recommendedSpeedMmSec).toBeCloseTo(10 * 0.8 * 0.82, 6);
    expect(result.recommendedMaxPowerPercent).toBe(70);
    expect(result.recommendedPasses).toBe(1);
  });

  it("clamps speed and power to machine/profile and safe ranges", () => {
    const highPreset = { ...preset, baseSpeedMmSec: 1000, baseMaxPowerPercent: 99 };
    const correction = createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm);
    correction.maxPowerBiasPercent = 20;
    const profile = { ...DEFAULT_MACHINE_MOTION_PROFILE, maxSpeedMmSec: 30, speedFactorPercent: 200 };
    const result = createLaserRecommendation({
      vectorJobId: "job-test",
      machine: DEFAULT_LASER_MACHINE,
      motionProfile: profile,
      material,
      preset: highPreset,
      analysis: baseAnalysis(),
      correction,
      operationType: "Cut",
      desiredQuality: "Fast",
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(result.recommendedSpeedMmSec).toBe(30);
    expect(result.recommendedMaxPowerPercent).toBe(100);
  });

  it("stores the absolute machine motion snapshot in each recommendation", () => {
    const result = recommendation();

    expect(result.machineMotionSnapshotJson.maxSpeedMmSec).toBe(DEFAULT_MACHINE_MOTION_PROFILE.maxSpeedMmSec);
    expect(result.machineMotionSnapshotJson.idleAccelerationMmSec2).toBe(DEFAULT_MACHINE_MOTION_PROFILE.idleAccelerationMmSec2);
    expect(result.machineMotionSnapshotJson.cutAccelerationMmSec2).toBe(DEFAULT_MACHINE_MOTION_PROFILE.cutAccelerationMmSec2);
    expect(result.machineMotionSnapshotJson.controllerType).toBe(DEFAULT_LASER_MACHINE.controllerType);
  });
});

describe("LaserCoach feedback learning", () => {
  it("updates correction factors for cut-through failures", () => {
    const rec = recommendation();
    const correction = createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm);
    const result = processLaserJobFeedback({
      feedback: { ...feedback("DidNotCutThrough", 3, rec.id), actualMaxPowerPercent: 70 },
      recommendation: rec,
      correction,
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(result.correction.maxPowerBiasPercent).toBeGreaterThan(0);
    expect(result.correction.samplesCount).toBe(1);
    expect(result.history.reason).toContain("Did not cut through");
  });

  it("applies larger severity effects than smaller severity effects", () => {
    const rec = recommendation();
    const low = processLaserJobFeedback({
      feedback: { ...feedback("AlmostCutThrough", 1, rec.id), actualMaxPowerPercent: 70 },
      recommendation: rec,
      correction: createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm),
      now: "2026-01-01T00:00:00.000Z",
    });
    const high = processLaserJobFeedback({
      feedback: { ...feedback("AlmostCutThrough", 5, rec.id), actualMaxPowerPercent: 70 },
      recommendation: rec,
      correction: createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm),
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(high.correction.maxPowerBiasPercent).toBeGreaterThan(low.correction.maxPowerBiasPercent);
  });

  it("does not mutate machine motion profile for lost steps feedback", () => {
    const profileBefore = { ...DEFAULT_MACHINE_MOTION_PROFILE };
    const rec = recommendation(undefined, DEFAULT_MACHINE_MOTION_PROFILE);
    const correction = createDefaultCorrection(DEFAULT_LASER_MACHINE.id, material.id, "Cut", preset.lensFocalLengthMm);
    const result = processLaserJobFeedback({
      feedback: feedback("LostSteps", 5, rec.id),
      recommendation: rec,
      correction,
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(DEFAULT_MACHINE_MOTION_PROFILE).toEqual(profileBefore);
    expect(result.correction.speedMultiplier).toBe(correction.speedMultiplier);
    expect(result.correction.maxPowerBiasPercent).toBe(correction.maxPowerBiasPercent);
    expect(result.warnings.join(" ")).toContain("Machine motion was not changed");
  });
});

describe("LaserCoach SVG safety and geometry", () => {
  it("rejects script, event handlers, foreignObject, and remote references", () => {
    expect(sanitizeSvgForAnalysis(`<svg><script>alert(1)</script></svg>`).ok).toBe(false);
    expect(sanitizeSvgForAnalysis(`<svg onload="alert(1)"><rect width="1" height="1"/></svg>`).ok).toBe(false);
    expect(sanitizeSvgForAnalysis(`<svg><foreignObject /></svg>`).ok).toBe(false);
    expect(sanitizeSvgForAnalysis(`<svg><image href="https://example.com/x.png" /></svg>`).ok).toBe(false);
  });

  it("measures basic SVG shapes", () => {
    const result = analyzeSvgVector({
      fileName: "rect.svg",
      svgText: `<svg viewBox="0 0 10 20" width="10mm" height="20mm"><rect x="0" y="0" width="10" height="20"/></svg>`,
    });

    expect(result.pathCount).toBe(1);
    expect(result.closedPathCount).toBe(1);
    expect(result.totalCutLengthMm).toBeCloseTo(60, 6);
    expect(result.boundingBoxWidthMm).toBeCloseTo(10, 6);
  });

  it("detects duplicate lines and open paths", () => {
    const result = analyzeSvgVector({
      fileName: "dupes.svg",
      svgText: `<svg viewBox="0 0 10 10" width="10mm" height="10mm"><line x1="0" y1="0" x2="10" y2="0"/><line x1="10" y1="0" x2="0" y2="0"/></svg>`,
    });

    expect(result.openPathCount).toBe(2);
    expect(result.duplicateLineCount).toBe(1);
  });

  it("emits tiny feature warnings", () => {
    const result = analyzeSvgVector({
      fileName: "tiny.svg",
      svgText: `<svg viewBox="0 0 10 10" width="10mm" height="10mm"><line x1="0" y1="0" x2="0.4" y2="0"/></svg>`,
    });

    expect(result.tinyFeatureCount).toBeGreaterThan(0);
    expect(result.warningsJson.join(" ")).toContain("below 1 mm");
  });
});

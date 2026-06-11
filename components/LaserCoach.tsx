"use client";

import { useEffect, useMemo, useState } from "react";
import { createLaserRecommendation, processLaserJobFeedback, correctionMatchesPreset } from "@/lib/calculators/lasercoach";
import { analyzeSvgVector } from "@/lib/calculators/lasercoach-svg";
import {
  cloneLaserCoachSeeds,
  createDefaultCorrection,
  LASER_AIR_ASSIST_LEVELS,
  LASER_OPERATION_TYPES,
  LASER_PROBLEM_TYPES,
  LASER_QUALITY_MODES,
  LASERCOACH_OWNER_ID,
  LASERCOACH_STORAGE_KEYS,
} from "@/lib/data/lasercoach";
import { LaserCoachIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { NumberInput } from "@/components/ui/NumberInput";
import type {
  CorrectionHistory,
  LaserDesiredQuality,
  LaserFileType,
  LaserJobFeedback,
  LaserMachine,
  LaserMaterial,
  LaserOperationPreset,
  LaserOperationType,
  LaserProblemType,
  LaserRecommendation,
  MachineMaterialCorrection,
  MachineMotionProfile,
  OpticalProfile,
  VectorAnalysis,
  VectorJob,
} from "@/types";

type StoreData = ReturnType<typeof cloneLaserCoachSeeds>;
type WizardStep = "setup" | "upload" | "results" | "feedback";
type InfoModal = { title: string; body: string } | null;

const TOOL_NAME = "Triple Factor Laser Coach";
const OPTICAL_PROFILE_STORAGE_KEY = "pnevma.opticalProfiles.v1";
const MAX_VECTOR_UPLOAD_BYTES = 2 * 1024 * 1024;
const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: "setup", label: "Set machine" },
  { id: "upload", label: "Upload" },
  { id: "results", label: "Results" },
  { id: "feedback", label: "Feedback" },
];

const LASERCOACH_FIELD_HELP: Record<string, string> = {
  laserMachine: "What it is: the physical laser you will run. Why it is needed: bed size, tube power, lens defaults, and controller details set the recommendation boundaries.",
  bedWidthMm: "What it is: usable bed width in millimetres. Why it is needed: the vector must fit the machine and the motion snapshot records the real work area.",
  bedHeightMm: "What it is: usable bed height in millimetres. Why it is needed: the vector must fit the machine and scale warnings need the real bed size.",
  kerfMm: "What it is: expected cut width removed by the beam. Why it is needed: small details and fit risk depend on kerf.",
  controllerType: "What it is: controller family such as Ruida, Trocen, GRBL, or Smoothieware. Why it is needed: motion warnings and exports need controller context.",
  controllerModel: "What it is: optional controller model name. Why it is needed: it helps audit which machine settings produced a recommendation.",
  defaultFocusOffsetMm: "What it is: your machine's normal focus offset. Why it is needed: the recommended focus offset is added to this baseline.",
  opticalProfile: "What it is: optics saved from CO2 Laser Spot Diameter. Why it is needed: lens, spot, source watt, and beam quality affect the energy factor.",
  profileLabel: "What it is: a readable name for these optics. Why it is needed: saved recommendations are easier to identify later.",
  lensFocalLengthMm: "What it is: lens focal length in millimetres. Why it is needed: focus and the correction profile are lens-specific.",
  spotDiameterMm: "What it is: measured focused spot diameter. Why it is needed: detail risk and geometry warnings depend on the real spot size.",
  sourcePowerW: "What it is: rated lamp or source power in watts. Why it is needed: power percent only makes sense with the source context.",
  measuredOutputPowerW: "What it is: real measured maximum optical output. Why it is needed: it records the watt equivalent behind percent power when measured data exists.",
  tubeCurrentMa: "What it is: tube current used for the optical profile. Why it is needed: it helps compare recommendations made at different source conditions.",
  m2: "What it is: beam quality factor. Why it is needed: it describes how far the beam is from an ideal Gaussian beam.",
  wavelengthUm: "What it is: laser wavelength in micrometres. Why it is needed: CO2 optics calculations use wavelength as part of the optical profile.",
  motionProfile: "What it is: saved speed and acceleration profile. Why it is needed: recommendations must respect absolute machine motion limits.",
  maxSpeedMmSec: "What it is: maximum allowed head speed. Why it is needed: recommended speed is clamped to this absolute limit.",
  maxAccelerationMmSec2: "What it is: maximum configured acceleration. Why it is needed: risk warnings compare idle and operation acceleration against this ceiling.",
  idleSpeedMmSec: "What it is: rapid travel speed when the laser is not cutting. Why it is needed: estimated job time includes travel moves.",
  idleAccelerationMmSec2: "What it is: rapid travel acceleration. Why it is needed: aggressive travel acceleration can cause lost steps.",
  cutAccelerationMmSec2: "What it is: acceleration used while cutting. Why it is needed: corner dwell, time estimates, and small-feature risk depend on it.",
  scanAccelerationMmSec2: "What it is: acceleration used for scanning or engraving. Why it is needed: engraving time and banding risk use this when available.",
  accelFactorPercent: "What it is: controller acceleration factor. Why it is needed: it records how the machine scales acceleration in practice.",
  g0AccelFactorPercent: "What it is: rapid move acceleration factor. Why it is needed: high G0 acceleration can cause travel lost steps.",
  speedFactorPercent: "What it is: controller speed scaling factor. Why it is needed: speed is clamped by the stored machine speed factor.",
  material: "What it is: material preset and thickness. Why it is needed: base speed, power, passes, and warnings start from material behavior.",
  operation: "What it is: cut, score, line engrave, fill engrave, photo engrave, or mark. Why it is needed: operation changes speed limits and power logic.",
  quality: "What it is: desired balance between speed and finish. Why it is needed: it biases the speed multiplier before clamping.",
  declaredWidthMm: "What it is: intended real-world width of the uploaded vector. Why it is needed: SVG units need real size to calculate length and scale.",
  declaredHeightMm: "What it is: intended real-world height of the uploaded vector. Why it is needed: SVG units need real size to calculate area and scale.",
  vectorFile: "What it is: the SVG, DXF, AI, or PDF job file. Why it is needed: geometry drives risk, time, and correction logic.",
  svgSource: "What it is: sanitized SVG text for the current job. Why it is needed: SVG is the parser implemented now for geometry analysis.",
  wasSuccessful: "What it is: whether the real job worked. Why it is needed: successful jobs increase correction confidence.",
  problemType: "What it is: the main problem observed after the real job. Why it is needed: each problem changes correction factors differently.",
  severity: "What it is: problem strength from 1 to 5. Why it is needed: stronger problems apply larger but still controlled correction changes.",
  airAssistUsed: "What it is: air assist used for the job. Why it is needed: feedback is easier to interpret when process conditions are recorded.",
  comment: "What it is: your note about the real result. Why it is needed: it keeps context that a numeric correction cannot capture.",
  importExportJson: "What it is: portable JSON for machines, presets, and corrections. Why it is needed: you can move or back up editable setup data.",
};

function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : fallback;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveArray<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function replaceById<T extends { id: string }>(items: T[], next: T): T[] {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => item.id === next.id ? next : item)
    : [next, ...items];
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string, fallback: number | null): number | null {
  if (!value.trim()) return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function format(value: number | null | undefined, decimals = 2, fallback = "N/A") {
  const safeDecimals = Math.min(Math.max(decimals, 0), 2);
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(safeDecimals) : fallback;
}

function formatInput(value: number | null | undefined, decimals = 2, fallback = "") {
  return typeof value === "number" && Number.isFinite(value) ? format(value, decimals) : fallback;
}

function formatSnapshotValue(value: unknown) {
  if (typeof value === "number") return format(value, 2);
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function selectedOrFirst<T extends { id: string }>(items: T[], id: string): T {
  return items.find((item) => item.id === id) || items[0];
}

function correctionKey(correction: MachineMaterialCorrection) {
  return `${correction.laserMachineId}:${correction.materialId}:${correction.operationType}:${correction.lensFocalLengthMm}`;
}

function fileTypeFromName(fileName: string): LaserFileType {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "svg") return "Svg";
  if (ext === "dxf") return "Dxf";
  if (ext === "pdf") return "Pdf";
  if (ext === "ai") return "Ai";
  return "Unknown";
}

function isSvgFileName(fileName: string) {
  return fileTypeFromName(fileName) === "Svg";
}

function profileSpotDiameter(profile: OpticalProfile): number | null {
  if (typeof profile.measuredSpotDiameterMm === "number" && Number.isFinite(profile.measuredSpotDiameterMm)) {
    return profile.measuredSpotDiameterMm;
  }
  if (typeof profile.measuredSpotDiameterUm === "number" && Number.isFinite(profile.measuredSpotDiameterUm)) {
    return profile.measuredSpotDiameterUm / 1000;
  }
  return null;
}

function opticalProfileLabel(profile: OpticalProfile) {
  const spot = profileSpotDiameter(profile);
  const power = profile.measuredOutputPowerW ?? profile.tubePowerW;
  return `${profile.profileName} - ${format(profile.lensFocalLengthMm, 1)} mm lens${spot ? `, ${format(spot, 3)} mm spot` : ""}${power ? `, ${format(power, 0)} W` : ""}`;
}

function InfoLabel({ label, field, onOpen }: { label: string; field: string; onOpen: (modal: { title: string; body: string }) => void }) {
  return (
    <span className="label-line">
      {label}
      <InfoButton title={label} body={LASERCOACH_FIELD_HELP[field] || "What it is: editable job data. Why it is needed: the recommendation needs this context."} onOpen={onOpen} />
    </span>
  );
}

function exportPayload(data: {
  machines: LaserMachine[];
  motionProfiles: MachineMotionProfile[];
  materials: LaserMaterial[];
  operationPresets: LaserOperationPreset[];
  corrections: MachineMaterialCorrection[];
  correctionHistory: CorrectionHistory[];
}) {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    machines: data.machines,
    motionProfiles: data.motionProfiles,
    materials: data.materials,
    operationPresets: data.operationPresets,
    corrections: data.corrections,
    correctionHistory: data.correctionHistory,
  }, null, 2);
}

export function LaserCoach() {
  const seeds = useMemo(() => cloneLaserCoachSeeds(), []);
  const [machines, setMachines] = useState<LaserMachine[]>(seeds.machines);
  const [motionProfiles, setMotionProfiles] = useState<MachineMotionProfile[]>(seeds.motionProfiles);
  const [materials, setMaterials] = useState<LaserMaterial[]>(seeds.materials);
  const [operationPresets, setOperationPresets] = useState<LaserOperationPreset[]>(seeds.operationPresets);
  const [vectorJobs, setVectorJobs] = useState<VectorJob[]>([]);
  const [vectorAnalyses, setVectorAnalyses] = useState<VectorAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<LaserRecommendation[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<LaserJobFeedback[]>([]);
  const [corrections, setCorrections] = useState<MachineMaterialCorrection[]>([]);
  const [correctionHistory, setCorrectionHistory] = useState<CorrectionHistory[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("setup");
  const [machineId, setMachineId] = useState(seeds.machines[0].id);
  const [motionProfileId, setMotionProfileId] = useState(seeds.motionProfiles[0].id);
  const [materialId, setMaterialId] = useState(seeds.materials[0].id);
  const [operationType, setOperationType] = useState<LaserOperationType>("Cut");
  const [desiredQuality, setDesiredQuality] = useState<LaserDesiredQuality>("Balanced");
  const [fileName, setFileName] = useState("sample.svg");
  const [svgText, setSvgText] = useState(`<svg viewBox="0 0 100 60" width="100mm" height="60mm"><rect x="5" y="5" width="90" height="50"/><circle cx="50" cy="30" r="4"/><line x1="5" y1="5" x2="95" y2="55"/></svg>`);
  const [declaredWidthMm, setDeclaredWidthMm] = useState("100");
  const [declaredHeightMm, setDeclaredHeightMm] = useState("60");
  const [analysis, setAnalysis] = useState<VectorAnalysis | null>(null);
  const [recommendation, setRecommendation] = useState<LaserRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wasSuccessful, setWasSuccessful] = useState(false);
  const [problemType, setProblemType] = useState<LaserProblemType>("DidNotCutThrough");
  const [severity, setSeverity] = useState("3");
  const [userComment, setUserComment] = useState("");
  const [exportJson, setExportJson] = useState("");
  const [opticalProfiles, setOpticalProfiles] = useState<OpticalProfile[]>([]);
  const [selectedOpticalProfileId, setSelectedOpticalProfileId] = useState("");
  const [opticProfileName, setOpticProfileName] = useState("Editable optics");
  const [lensFocalLengthMm, setLensFocalLengthMm] = useState("50.8");
  const [measuredSpotDiameterMm, setMeasuredSpotDiameterMm] = useState("0.12");
  const [sourcePowerW, setSourcePowerW] = useState("130");
  const [measuredOutputPowerW, setMeasuredOutputPowerW] = useState("");
  const [beamQualityM2, setBeamQualityM2] = useState("1");
  const [wavelengthUm, setWavelengthUm] = useState("10.6");
  const [sourceCurrentMa, setSourceCurrentMa] = useState("");
  const [infoModal, setInfoModal] = useState<InfoModal>(null);

  useEffect(() => {
    const loaded: StoreData = {
      machines: loadArray(LASERCOACH_STORAGE_KEYS.machines, seeds.machines),
      motionProfiles: loadArray(LASERCOACH_STORAGE_KEYS.motionProfiles, seeds.motionProfiles),
      materials: loadArray(LASERCOACH_STORAGE_KEYS.materials, seeds.materials),
      operationPresets: loadArray(LASERCOACH_STORAGE_KEYS.operationPresets, seeds.operationPresets),
      vectorJobs: loadArray(LASERCOACH_STORAGE_KEYS.vectorJobs, []),
      vectorAnalyses: loadArray(LASERCOACH_STORAGE_KEYS.vectorAnalyses, []),
      recommendations: loadArray(LASERCOACH_STORAGE_KEYS.recommendations, []),
      feedback: loadArray(LASERCOACH_STORAGE_KEYS.feedback, []),
      corrections: loadArray(LASERCOACH_STORAGE_KEYS.corrections, []),
      correctionHistory: loadArray(LASERCOACH_STORAGE_KEYS.correctionHistory, []),
    };
    const loadedOptics = loadArray<OpticalProfile>(OPTICAL_PROFILE_STORAGE_KEY, []);
    const defaultMachine = loaded.machines[0] || seeds.machines[0];
    const selectedOptic = loadedOptics[0];

    setMachines(loaded.machines);
    setMotionProfiles(loaded.motionProfiles);
    setMaterials(loaded.materials);
    setOperationPresets(loaded.operationPresets);
    setVectorJobs(loaded.vectorJobs);
    setVectorAnalyses(loaded.vectorAnalyses);
    setRecommendations(loaded.recommendations);
    setFeedbackItems(loaded.feedback);
    setCorrections(loaded.corrections);
    setCorrectionHistory(loaded.correctionHistory);
    setOpticalProfiles(loadedOptics);
    setMachineId(defaultMachine.id);
    setMotionProfileId(loaded.motionProfiles[0]?.id || seeds.motionProfiles[0].id);
    setMaterialId(loaded.materials[0]?.id || seeds.materials[0].id);

    if (selectedOptic) {
      setSelectedOpticalProfileId(selectedOptic.id);
      setOpticProfileName(selectedOptic.profileName);
      setLensFocalLengthMm(formatInput(selectedOptic.lensFocalLengthMm || defaultMachine.defaultLensFocalLengthMm, 2));
      setMeasuredSpotDiameterMm(formatInput(profileSpotDiameter(selectedOptic) ?? 0.12, 2));
      setSourcePowerW(formatInput(selectedOptic.tubePowerW ?? defaultMachine.tubePowerW, 2));
      setMeasuredOutputPowerW(selectedOptic.measuredOutputPowerW ? formatInput(selectedOptic.measuredOutputPowerW, 2) : "");
      setBeamQualityM2(formatInput(selectedOptic.m2 ?? 1, 2));
      setWavelengthUm(formatInput(selectedOptic.wavelengthUm ?? 10.6, 2));
      setSourceCurrentMa(selectedOptic.tubeCurrentMa ? formatInput(selectedOptic.tubeCurrentMa, 2) : "");
    } else {
      setSelectedOpticalProfileId("");
      setLensFocalLengthMm(formatInput(defaultMachine.defaultLensFocalLengthMm, 2));
      setSourcePowerW(formatInput(defaultMachine.tubePowerW, 2));
      setMeasuredOutputPowerW(defaultMachine.realMeasuredMaxPowerW ? formatInput(defaultMachine.realMeasuredMaxPowerW, 2) : "");
    }

    setStorageReady(true);
  }, [seeds]);

  useEffect(() => {
    if (!storageReady) return;
    saveArray(LASERCOACH_STORAGE_KEYS.machines, machines);
    saveArray(LASERCOACH_STORAGE_KEYS.motionProfiles, motionProfiles);
    saveArray(LASERCOACH_STORAGE_KEYS.materials, materials);
    saveArray(LASERCOACH_STORAGE_KEYS.operationPresets, operationPresets);
    saveArray(LASERCOACH_STORAGE_KEYS.vectorJobs, vectorJobs);
    saveArray(LASERCOACH_STORAGE_KEYS.vectorAnalyses, vectorAnalyses);
    saveArray(LASERCOACH_STORAGE_KEYS.recommendations, recommendations);
    saveArray(LASERCOACH_STORAGE_KEYS.feedback, feedbackItems);
    saveArray(LASERCOACH_STORAGE_KEYS.corrections, corrections);
    saveArray(LASERCOACH_STORAGE_KEYS.correctionHistory, correctionHistory);
  }, [correctionHistory, corrections, feedbackItems, machines, materials, motionProfiles, operationPresets, recommendations, storageReady, vectorAnalyses, vectorJobs]);

  useEffect(() => {
    if (!infoModal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setInfoModal(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [infoModal]);

  const machine = selectedOrFirst(machines, machineId);
  const machineMotionProfiles = motionProfiles.filter((item) => item.laserMachineId === machine.id);
  const motionProfile = selectedOrFirst(machineMotionProfiles, motionProfileId) || motionProfiles[0];
  const material = selectedOrFirst(materials, materialId);
  const preset = operationPresets.find((item) => item.materialId === material.id && item.operationType === operationType) ||
    operationPresets.find((item) => item.materialId === material.id) ||
    operationPresets[0];
  const effectiveLensFocalLengthMm = numberValue(lensFocalLengthMm, machine.defaultLensFocalLengthMm || preset.lensFocalLengthMm);
  const effectiveMeasuredOutputPowerW = optionalNumber(measuredOutputPowerW, machine.realMeasuredMaxPowerW ?? null);
  const effectiveMachine: LaserMachine = {
    ...machine,
    tubePowerW: numberValue(sourcePowerW, machine.tubePowerW),
    realMeasuredMaxPowerW: effectiveMeasuredOutputPowerW,
    defaultLensFocalLengthMm: effectiveLensFocalLengthMm,
  };
  const effectivePreset: LaserOperationPreset = {
    ...preset,
    lensFocalLengthMm: effectiveLensFocalLengthMm,
  };
  const currentCorrection = corrections.find((item) => correctionMatchesPreset(item, machine.id, material.id, operationType, effectivePreset.lensFocalLengthMm)) ||
    createDefaultCorrection(machine.id, material.id, operationType, effectivePreset.lensFocalLengthMm);
  const currentFileType = fileTypeFromName(fileName);
  const selectedOpticalProfile = opticalProfiles.find((item) => item.id === selectedOpticalProfileId) || null;

  function updateMachine<K extends keyof LaserMachine>(field: K, value: LaserMachine[K]) {
    const next = { ...machine, [field]: value, updatedAt: new Date().toISOString() };
    setMachines((items) => replaceById(items, next));
  }

  function updateMotion<K extends keyof MachineMotionProfile>(field: K, value: MachineMotionProfile[K]) {
    const next = { ...motionProfile, [field]: value, updatedAt: new Date().toISOString() };
    setMotionProfiles((items) => replaceById(items, next));
  }

  function applyOpticalProfile(profile: OpticalProfile) {
    setSelectedOpticalProfileId(profile.id);
    setOpticProfileName(profile.profileName);
    setLensFocalLengthMm(formatInput(profile.lensFocalLengthMm || machine.defaultLensFocalLengthMm, 2));
    setMeasuredSpotDiameterMm(formatInput(profileSpotDiameter(profile) ?? numberValue(measuredSpotDiameterMm, 0.12), 2));
    setSourcePowerW(formatInput(profile.tubePowerW ?? machine.tubePowerW, 2));
    setMeasuredOutputPowerW(profile.measuredOutputPowerW ? formatInput(profile.measuredOutputPowerW, 2) : "");
    setBeamQualityM2(formatInput(profile.m2 ?? numberValue(beamQualityM2, 1), 2));
    setWavelengthUm(formatInput(profile.wavelengthUm ?? 10.6, 2));
    setSourceCurrentMa(profile.tubeCurrentMa ? formatInput(profile.tubeCurrentMa, 2) : "");
  }

  function applyOpticsToMachineDefaults() {
    const now = new Date().toISOString();
    const next: LaserMachine = {
      ...machine,
      tubePowerW: numberValue(sourcePowerW, machine.tubePowerW),
      realMeasuredMaxPowerW: optionalNumber(measuredOutputPowerW, machine.realMeasuredMaxPowerW ?? null),
      defaultLensFocalLengthMm: numberValue(lensFocalLengthMm, machine.defaultLensFocalLengthMm),
      updatedAt: now,
    };
    setMachines((items) => replaceById(items, next));
  }

  async function handleVectorUpload(file: File) {
    setError(null);
    if (file.size > MAX_VECTOR_UPLOAD_BYTES) {
      setError("Vector upload is over the 2 MB limit.");
      return;
    }
    setFileName(file.name);
    if (isSvgFileName(file.name)) {
      setSvgText(await file.text());
    } else {
      setSvgText("");
      setError("DXF and AI upload are accepted for the workflow, but recommendation analysis currently needs SVG.");
    }
  }

  function analyzeAndRecommend() {
    try {
      setError(null);
      if (!isSvgFileName(fileName)) {
        setError("DXF and AI parsers are reserved for the next import layer. Upload an SVG to generate recommendations now.");
        setWizardStep("upload");
        return;
      }
      if (!svgText.trim()) {
        setError("Upload or paste an SVG before running the recommendation.");
        setWizardStep("upload");
        return;
      }

      const rawAnalysis = analyzeSvgVector({
        fileName,
        svgText,
        declaredWidthMm: numberValue(declaredWidthMm, 0) || null,
        declaredHeightMm: numberValue(declaredHeightMm, 0) || null,
      });
      const now = new Date().toISOString();
      const job: VectorJob = {
        id: `job-${Date.now()}`,
        ownerUserId: LASERCOACH_OWNER_ID,
        laserMachineId: machine.id,
        motionProfileId: motionProfile.id,
        fileName,
        fileType: currentFileType,
        originalFilePath: null,
        fileBlobReference: "local-browser-upload",
        declaredWidthMm: numberValue(declaredWidthMm, rawAnalysis.boundingBoxWidthMm),
        declaredHeightMm: numberValue(declaredHeightMm, rawAnalysis.boundingBoxHeightMm),
        detectedWidthMm: rawAnalysis.detectedWidthMm,
        detectedHeightMm: rawAnalysis.detectedHeightMm,
        scaleFactor: rawAnalysis.scaleFactor,
        operationType,
        materialId: material.id,
        lensFocalLengthMm: effectivePreset.lensFocalLengthMm,
        desiredQuality,
        createdAt: now,
        updatedAt: now,
      };
      const nextAnalysis: VectorAnalysis = {
        id: `analysis-${Date.now()}`,
        vectorJobId: job.id,
        totalCutLengthMm: rawAnalysis.totalCutLengthMm,
        totalScoreLengthMm: rawAnalysis.totalScoreLengthMm,
        estimatedEngraveAreaMm2: rawAnalysis.estimatedEngraveAreaMm2,
        pathCount: rawAnalysis.pathCount,
        openPathCount: rawAnalysis.openPathCount,
        closedPathCount: rawAnalysis.closedPathCount,
        duplicateLineCount: rawAnalysis.duplicateLineCount,
        tinyFeatureCount: rawAnalysis.tinyFeatureCount,
        smallestFeatureMm: rawAnalysis.smallestFeatureMm,
        smallestGapMm: rawAnalysis.smallestGapMm,
        sharpCornerCount: rawAnalysis.sharpCornerCount,
        curveSegmentCount: rawAnalysis.curveSegmentCount,
        boundingBoxWidthMm: rawAnalysis.boundingBoxWidthMm,
        boundingBoxHeightMm: rawAnalysis.boundingBoxHeightMm,
        hasUnsupportedElements: rawAnalysis.hasUnsupportedElements,
        warningsJson: rawAnalysis.warningsJson,
        createdAt: now,
      };
      const nextRecommendation = createLaserRecommendation({
        vectorJobId: job.id,
        machine: effectiveMachine,
        motionProfile,
        material,
        preset: effectivePreset,
        analysis: nextAnalysis,
        correction: currentCorrection,
        operationType,
        desiredQuality,
        now,
      });
      setVectorJobs((items) => replaceById(items, job));
      setVectorAnalyses((items) => replaceById(items, nextAnalysis));
      setRecommendations((items) => replaceById(items, nextRecommendation));
      setAnalysis(nextAnalysis);
      setRecommendation(nextRecommendation);
      setWizardStep("results");
    } catch (err) {
      setAnalysis(null);
      setRecommendation(null);
      setError(err instanceof Error ? err.message : "SVG analysis failed.");
    }
  }

  function submitFeedback() {
    if (!recommendation) return;
    const feedback: LaserJobFeedback = {
      id: `feedback-${Date.now()}`,
      recommendationId: recommendation.id,
      ownerUserId: LASERCOACH_OWNER_ID,
      wasSuccessful,
      problemType: wasSuccessful ? "None" : problemType,
      severity: numberValue(severity, 3),
      userComment: userComment || null,
      actualSpeedMmSec: recommendation.recommendedSpeedMmSec,
      actualMinPowerPercent: recommendation.recommendedMinPowerPercent,
      actualMaxPowerPercent: recommendation.recommendedMaxPowerPercent,
      actualPasses: recommendation.recommendedPasses,
      actualLineIntervalMm: recommendation.recommendedLineIntervalMm,
      actualFocusOffsetMm: recommendation.recommendedFocusOffsetMm,
      actualAirAssist: recommendation.recommendedAirAssist,
      resultPhotoPath: null,
      createdAt: new Date().toISOString(),
    };
    const processed = processLaserJobFeedback({ feedback, recommendation, correction: currentCorrection });
    setFeedbackItems((items) => replaceById(items, feedback));
    setCorrections((items) => replaceById(items, processed.correction));
    setCorrectionHistory((items) => replaceById(items, processed.history));
    setUserComment("");
  }

  function importJson() {
    try {
      const parsed = JSON.parse(exportJson) as Partial<StoreData>;
      if (Array.isArray(parsed.machines)) setMachines(parsed.machines);
      if (Array.isArray(parsed.motionProfiles)) setMotionProfiles(parsed.motionProfiles);
      if (Array.isArray(parsed.materials)) setMaterials(parsed.materials);
      if (Array.isArray(parsed.operationPresets)) setOperationPresets(parsed.operationPresets);
      if (Array.isArray(parsed.corrections)) setCorrections(parsed.corrections);
      if (Array.isArray(parsed.correctionHistory)) setCorrectionHistory(parsed.correctionHistory);
      setError(null);
    } catch {
      setError("Imported JSON could not be parsed.");
    }
  }

  function renderSetupStep() {
    return (
      <>
        <section className="panel panel-pad stack">
          <h2>Machine</h2>
          <label>
            <InfoLabel label="Laser machine" field="laserMachine" onOpen={setInfoModal} />
            <select value={machine.id} onChange={(event) => setMachineId(event.target.value)}>
              {machines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Bed width (mm)" field="bedWidthMm" onOpen={setInfoModal} />
              <NumberInput min="1" step="1" value={String(machine.bedWidthMm)} onValueChange={(value) => updateMachine("bedWidthMm", numberValue(value, machine.bedWidthMm))} />
            </label>
            <label>
              <InfoLabel label="Bed height (mm)" field="bedHeightMm" onOpen={setInfoModal} />
              <NumberInput min="1" step="1" value={String(machine.bedHeightMm)} onValueChange={(value) => updateMachine("bedHeightMm", numberValue(value, machine.bedHeightMm))} />
            </label>
            <label>
              <InfoLabel label="Kerf (mm)" field="kerfMm" onOpen={setInfoModal} />
              <NumberInput min="0" step="0.01" value={format(machine.defaultKerfMm, 2)} onValueChange={(value) => updateMachine("defaultKerfMm", numberValue(value, machine.defaultKerfMm))} />
            </label>
          </div>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Controller" field="controllerType" onOpen={setInfoModal} />
              <input value={machine.controllerType} onChange={(event) => updateMachine("controllerType", event.target.value)} />
            </label>
            <label>
              <InfoLabel label="Controller model" field="controllerModel" onOpen={setInfoModal} />
              <input value={machine.controllerModel ?? ""} onChange={(event) => updateMachine("controllerModel", event.target.value || null)} />
            </label>
            <label>
              <InfoLabel label="Default focus offset (mm)" field="defaultFocusOffsetMm" onOpen={setInfoModal} />
              <NumberInput step="0.1" value={String(machine.defaultFocusOffsetMm)} onValueChange={(value) => updateMachine("defaultFocusOffsetMm", numberValue(value, machine.defaultFocusOffsetMm))} />
            </label>
          </div>
        </section>

        <section className="panel panel-pad stack">
          <h2>Optics and source</h2>
          <label>
            <InfoLabel label="CO2 Spot Diameter profile" field="opticalProfile" onOpen={setInfoModal} />
            <select value={selectedOpticalProfileId} onChange={(event) => {
              const profile = opticalProfiles.find((item) => item.id === event.target.value);
              if (profile) applyOpticalProfile(profile);
              else setSelectedOpticalProfileId("");
            }}>
              <option value="">Editable manual optics</option>
              {opticalProfiles.map((item) => <option key={item.id} value={item.id}>{opticalProfileLabel(item)}</option>)}
            </select>
          </label>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Profile label" field="profileLabel" onOpen={setInfoModal} />
              <input value={opticProfileName} onChange={(event) => setOpticProfileName(event.target.value)} />
            </label>
            <label>
              <InfoLabel label="Lens focal length (mm)" field="lensFocalLengthMm" onOpen={setInfoModal} />
              <NumberInput min="1" step="0.1" value={lensFocalLengthMm} onValueChange={setLensFocalLengthMm} />
            </label>
            <label>
              <InfoLabel label="Spot diameter (mm)" field="spotDiameterMm" onOpen={setInfoModal} />
              <NumberInput min="0.01" step="0.01" value={measuredSpotDiameterMm} onValueChange={setMeasuredSpotDiameterMm} />
            </label>
          </div>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Lamp / source power (W)" field="sourcePowerW" onOpen={setInfoModal} />
              <NumberInput min="1" step="1" value={sourcePowerW} onValueChange={setSourcePowerW} />
            </label>
            <label>
              <InfoLabel label="Measured output (W)" field="measuredOutputPowerW" onOpen={setInfoModal} />
              <NumberInput min="0" step="1" value={measuredOutputPowerW} onValueChange={setMeasuredOutputPowerW} />
            </label>
            <label>
              <InfoLabel label="Tube current (mA)" field="tubeCurrentMa" onOpen={setInfoModal} />
              <NumberInput min="0" step="0.1" value={sourceCurrentMa} onValueChange={setSourceCurrentMa} />
            </label>
          </div>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="M2" field="m2" onOpen={setInfoModal} />
              <NumberInput min="0.1" step="0.05" value={beamQualityM2} onValueChange={setBeamQualityM2} />
            </label>
            <label>
              <InfoLabel label="Wavelength (um)" field="wavelengthUm" onOpen={setInfoModal} />
              <NumberInput min="0.1" step="0.1" value={wavelengthUm} onValueChange={setWavelengthUm} />
            </label>
            <button className="button secondary lasercoach-inline-button" type="button" onClick={applyOpticsToMachineDefaults}>Apply to machine</button>
          </div>
          <p className="data-note">
            {selectedOpticalProfile
              ? `Pulled from CO2 Laser Spot Diameter and editable here. Last saved: ${selectedOpticalProfile.updatedAt ? new Date(selectedOpticalProfile.updatedAt).toLocaleString() : "N/A"}.`
              : "No saved CO2 Laser Spot Diameter profile is selected; editable manual optics are active."}
          </p>
        </section>

        <section className="panel panel-pad stack">
          <h2>Motion profile</h2>
          <label>
            <InfoLabel label="Profile" field="motionProfile" onOpen={setInfoModal} />
            <select value={motionProfile.id} onChange={(event) => setMotionProfileId(event.target.value)}>
              {machineMotionProfiles.map((item) => <option key={item.id} value={item.id}>{item.profileName}</option>)}
            </select>
          </label>
          <div className="lasercoach-three">
            <label><InfoLabel label="Max speed (mm/s)" field="maxSpeedMmSec" onOpen={setInfoModal} /><NumberInput min="0.1" step="1" value={String(motionProfile.maxSpeedMmSec)} onValueChange={(value) => updateMotion("maxSpeedMmSec", numberValue(value, motionProfile.maxSpeedMmSec))} /></label>
            <label><InfoLabel label="Max accel (mm/s^2)" field="maxAccelerationMmSec2" onOpen={setInfoModal} /><NumberInput min="1" step="100" value={String(motionProfile.maxAccelerationMmSec2)} onValueChange={(value) => updateMotion("maxAccelerationMmSec2", numberValue(value, motionProfile.maxAccelerationMmSec2))} /></label>
            <label><InfoLabel label="Idle speed (mm/s)" field="idleSpeedMmSec" onOpen={setInfoModal} /><NumberInput min="0.1" step="1" value={String(motionProfile.idleSpeedMmSec)} onValueChange={(value) => updateMotion("idleSpeedMmSec", numberValue(value, motionProfile.idleSpeedMmSec))} /></label>
          </div>
          <div className="lasercoach-three">
            <label><InfoLabel label="Idle accel (mm/s^2)" field="idleAccelerationMmSec2" onOpen={setInfoModal} /><NumberInput min="1" step="100" value={String(motionProfile.idleAccelerationMmSec2)} onValueChange={(value) => updateMotion("idleAccelerationMmSec2", numberValue(value, motionProfile.idleAccelerationMmSec2))} /></label>
            <label><InfoLabel label="Cut accel (mm/s^2)" field="cutAccelerationMmSec2" onOpen={setInfoModal} /><NumberInput min="1" step="100" value={String(motionProfile.cutAccelerationMmSec2)} onValueChange={(value) => updateMotion("cutAccelerationMmSec2", numberValue(value, motionProfile.cutAccelerationMmSec2))} /></label>
            <label><InfoLabel label="Scan accel (mm/s^2)" field="scanAccelerationMmSec2" onOpen={setInfoModal} /><NumberInput min="1" step="100" value={String(motionProfile.scanAccelerationMmSec2 ?? "")} onValueChange={(value) => updateMotion("scanAccelerationMmSec2", value ? numberValue(value, motionProfile.scanAccelerationMmSec2 ?? motionProfile.cutAccelerationMmSec2) : null)} /></label>
          </div>
          <div className="lasercoach-three">
            <label><InfoLabel label="Accel factor (%)" field="accelFactorPercent" onOpen={setInfoModal} /><NumberInput min="0" max="200" step="1" value={String(motionProfile.accelFactorPercent)} onValueChange={(value) => updateMotion("accelFactorPercent", numberValue(value, motionProfile.accelFactorPercent))} /></label>
            <label><InfoLabel label="G0 accel factor (%)" field="g0AccelFactorPercent" onOpen={setInfoModal} /><NumberInput min="0" max="200" step="1" value={String(motionProfile.g0AccelFactorPercent)} onValueChange={(value) => updateMotion("g0AccelFactorPercent", numberValue(value, motionProfile.g0AccelFactorPercent))} /></label>
            <label><InfoLabel label="Speed factor (%)" field="speedFactorPercent" onOpen={setInfoModal} /><NumberInput min="0" max="200" step="1" value={String(motionProfile.speedFactorPercent)} onValueChange={(value) => updateMotion("speedFactorPercent", numberValue(value, motionProfile.speedFactorPercent))} /></label>
          </div>
        </section>

        <section className="panel panel-pad stack">
          <h2>Job</h2>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Material" field="material" onOpen={setInfoModal} />
              <select value={material.id} onChange={(event) => setMaterialId(event.target.value)}>
                {materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <InfoLabel label="Operation" field="operation" onOpen={setInfoModal} />
              <select value={operationType} onChange={(event) => setOperationType(event.target.value as LaserOperationType)}>
                {LASER_OPERATION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <InfoLabel label="Quality" field="quality" onOpen={setInfoModal} />
              <select value={desiredQuality} onChange={(event) => setDesiredQuality(event.target.value as LaserDesiredQuality)}>
                {LASER_QUALITY_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="lasercoach-step-actions">
            <button className="button" type="button" onClick={() => setWizardStep("upload")}>Continue to upload</button>
          </div>
        </section>
      </>
    );
  }

  function renderUploadStep() {
    return (
      <section className="panel panel-pad stack">
        <h2>Upload vector</h2>
        <div className="lasercoach-three">
          <label><InfoLabel label="Declared width (mm)" field="declaredWidthMm" onOpen={setInfoModal} /><NumberInput min="0.01" step="1" value={declaredWidthMm} onValueChange={setDeclaredWidthMm} /></label>
          <label><InfoLabel label="Declared height (mm)" field="declaredHeightMm" onOpen={setInfoModal} /><NumberInput min="0.01" step="1" value={declaredHeightMm} onValueChange={setDeclaredHeightMm} /></label>
          <label>
            <InfoLabel label="SVG / DXF / AI file" field="vectorFile" onOpen={setInfoModal} />
            <input type="file" accept=".svg,.dxf,.ai,.pdf,image/svg+xml,application/pdf,application/postscript" onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              await handleVectorUpload(file);
            }} />
          </label>
        </div>
        <article className="mini-panel lasercoach-upload-panel">
          <div>
            <h2>{fileName}</h2>
            <p className="small">Detected type: {currentFileType}. SVG is analyzed now; DXF and AI are kept behind the import abstraction for later parser support.</p>
          </div>
          <span className="lasercoach-file-kind">{currentFileType}</span>
        </article>
        <label>
          <InfoLabel label="SVG source" field="svgSource" onOpen={setInfoModal} />
          <textarea className="lasercoach-svg-input" value={svgText} onChange={(event) => {
            setSvgText(event.target.value);
            if (!isSvgFileName(fileName)) setFileName("pasted.svg");
          }} />
        </label>
        <div className="lasercoach-step-actions">
          <button className="button secondary" type="button" onClick={() => setWizardStep("setup")}>Back</button>
          <button className="button" type="button" onClick={analyzeAndRecommend}>Analyze and recommend</button>
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>
    );
  }

  function renderResultsStep() {
    return (
      <>
        <section className="panel panel-pad stack">
          <h2>Recommended results</h2>
          {recommendation ? (
            <>
              <div className="lasercoach-factor-grid">
                <article className="mini-panel lasercoach-factor-card">
                  <h2>1. Machine motion</h2>
                  <p className="small">Speed is capped by {format(motionProfile.maxSpeedMmSec, 2)} mm/s max speed, {format(motionProfile.speedFactorPercent, 0)}% speed factor, and {format(recommendation.recommendationReasoningJson.operationSpeedLimitMmSec, 2)} mm/s operation limit.</p>
                  <p className="small">Cut acceleration {format(motionProfile.cutAccelerationMmSec2, 0)} mm/s^2 and idle acceleration {format(motionProfile.idleAccelerationMmSec2, 0)} mm/s^2 drive time and lost-step warnings.</p>
                </article>
                <article className="mini-panel lasercoach-factor-card">
                  <h2>2. Optics + material</h2>
                  <p className="small">{material.name} starts from {format(effectivePreset.baseSpeedMmSec, 2)} mm/s and {format(effectivePreset.baseMinPowerPercent, 0)}-{format(effectivePreset.baseMaxPowerPercent, 0)}% power.</p>
                  <p className="small">Lens {format(effectiveLensFocalLengthMm, 2)} mm, spot {format(numberValue(measuredSpotDiameterMm, 0), 2)} mm, source {format(effectiveMachine.tubePowerW, 0)} W.</p>
                </article>
                <article className="mini-panel lasercoach-factor-card">
                  <h2>3. Vector + feedback</h2>
                  <p className="small">Geometry multiplier {format(recommendation.recommendationReasoningJson.geometrySpeedMultiplier, 2)} and quality multiplier {format(recommendation.recommendationReasoningJson.desiredQualityMultiplier, 2)} shape the final speed.</p>
                  <p className="small">Correction multiplier {format(currentCorrection.speedMultiplier, 2)}, power bias {format(currentCorrection.maxPowerBiasPercent, 2)}%, confidence {format(currentCorrection.confidenceScore * 100, 0)}%.</p>
                </article>
              </div>
              <div className="readouts lasercoach-readouts">
                <MetricCard label="Speed" value={`${format(recommendation.recommendedSpeedMmSec, 2)} mm/s`} />
                <MetricCard label="Power" value={`${format(recommendation.recommendedMinPowerPercent, 1)}-${format(recommendation.recommendedMaxPowerPercent, 1)}%`} />
                <MetricCard label="Passes" value={String(recommendation.recommendedPasses)} />
                <MetricCard label="Focus offset" value={`${format(recommendation.recommendedFocusOffsetMm, 2)} mm`} />
                <MetricCard label="Air assist" value={String(recommendation.recommendedAirAssist)} />
                <MetricCard label="Risk" value={recommendation.geometryRiskLevel} tone={recommendation.geometryRiskLevel === "High" ? "danger" : recommendation.geometryRiskLevel === "Medium" ? "warn" : "ok"} />
                <MetricCard label="Time estimate" value={`${format(recommendation.estimatedTimeSeconds, 1)} s`} />
                <MetricCard label="Line interval" value={recommendation.recommendedLineIntervalMm ? `${format(recommendation.recommendedLineIntervalMm, 3)} mm` : "N/A"} />
              </div>
              <article className="mini-panel">
                <h2>Warnings</h2>
                {(recommendation.recommendationReasoningJson.warnings.length ? recommendation.recommendationReasoningJson.warnings : ["No recommendation warnings."]).map((item) => <p className="small" key={item}>{item}</p>)}
              </article>
            </>
          ) : (
            <p className="data-note">No recommendation yet.</p>
          )}
          <div className="lasercoach-step-actions">
            <button className="button secondary" type="button" onClick={() => setWizardStep("upload")}>Back</button>
            <button className="button" type="button" disabled={!recommendation} onClick={() => setWizardStep("feedback")}>Continue to feedback</button>
          </div>
        </section>

        <section className="panel panel-pad stack">
          <h2>Vector analysis</h2>
          {analysis ? (
            <>
              <div className="readouts lasercoach-readouts">
                <MetricCard label="Cut length" value={`${format(analysis.totalCutLengthMm, 1)} mm`} />
                <MetricCard label="Paths" value={String(analysis.pathCount)} />
                <MetricCard label="Open paths" value={String(analysis.openPathCount)} tone={analysis.openPathCount ? "warn" : "ok"} />
                <MetricCard label="Duplicates" value={String(analysis.duplicateLineCount)} tone={analysis.duplicateLineCount ? "warn" : "ok"} />
                <MetricCard label="Tiny features" value={String(analysis.tinyFeatureCount)} tone={analysis.tinyFeatureCount ? "warn" : "ok"} />
                <MetricCard label="Bounds" value={`${format(analysis.boundingBoxWidthMm, 1)} x ${format(analysis.boundingBoxHeightMm, 1)} mm`} />
              </div>
              <article className="mini-panel">
                <h2>Analysis notes</h2>
                {(analysis.warningsJson.length ? analysis.warningsJson : ["No SVG analysis warnings."]).map((item) => <p className="small" key={item}>{item}</p>)}
              </article>
            </>
          ) : (
            <p className="data-note">No SVG has been analyzed.</p>
          )}
        </section>

        {recommendation ? (
          <section className="panel panel-pad stack">
            <h2>Motion snapshot</h2>
            <div className="lasercoach-kv-grid">
              {Object.entries(recommendation.machineMotionSnapshotJson).map(([key, value]) => (
                <div className="kv" key={key}>
                  <span>{key}</span>
                  <span>{formatSnapshotValue(value)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  function renderFeedbackStep() {
    return (
      <>
        <section className="panel panel-pad stack">
          <h2>Feedback</h2>
          <label className="check-label">
            <input type="checkbox" checked={wasSuccessful} onChange={(event) => setWasSuccessful(event.target.checked)} />
            <InfoLabel label="Successful job" field="wasSuccessful" onOpen={setInfoModal} />
          </label>
          <div className="lasercoach-three">
            <label>
              <InfoLabel label="Problem" field="problemType" onOpen={setInfoModal} />
              <select value={problemType} disabled={wasSuccessful} onChange={(event) => setProblemType(event.target.value as LaserProblemType)}>
                {LASER_PROBLEM_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label><InfoLabel label="Severity" field="severity" onOpen={setInfoModal} /><NumberInput min="1" max="5" step="1" value={severity} onValueChange={setSeverity} /></label>
            <label>
              <InfoLabel label="Air assist used" field="airAssistUsed" onOpen={setInfoModal} />
              <select value={recommendation?.recommendedAirAssist || "Medium"} disabled>
                {LASER_AIR_ASSIST_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label>
            <InfoLabel label="Comment" field="comment" onOpen={setInfoModal} />
            <textarea value={userComment} onChange={(event) => setUserComment(event.target.value)} />
          </label>
          <div className="lasercoach-step-actions">
            <button className="button secondary" type="button" onClick={() => setWizardStep("results")}>Back</button>
            <button className="button" type="button" disabled={!recommendation} onClick={submitFeedback}>Submit feedback</button>
          </div>
        </section>

        <section className="panel panel-pad stack">
          <h2>Correction profile</h2>
          <div className="readouts lasercoach-readouts">
            <MetricCard label="Speed multiplier" value={format(currentCorrection.speedMultiplier, 3)} />
            <MetricCard label="Max power bias" value={`${format(currentCorrection.maxPowerBiasPercent, 1)}%`} />
            <MetricCard label="Min power bias" value={`${format(currentCorrection.minPowerBiasPercent, 1)}%`} />
            <MetricCard label="Pass bias" value={String(currentCorrection.passBias)} />
            <MetricCard label="Confidence" value={`${format(currentCorrection.confidenceScore * 100, 0)}%`} />
            <MetricCard label="Samples" value={String(currentCorrection.samplesCount)} />
          </div>
          <p className="data-note">Correction key: {correctionKey(currentCorrection)}</p>
        </section>

        <section className="panel panel-pad stack">
          <h2>Import / export</h2>
          <div className="button-row">
            <button className="button secondary" type="button" onClick={() => setExportJson(exportPayload({ machines, motionProfiles, materials, operationPresets, corrections, correctionHistory }))}>Export JSON</button>
            <button className="button secondary" type="button" onClick={importJson}>Import JSON</button>
          </div>
          <InfoLabel label="JSON data" field="importExportJson" onOpen={setInfoModal} />
          <textarea className="notes-output" value={exportJson} onChange={(event) => setExportJson(event.target.value)} />
        </section>
      </>
    );
  }

  function renderWizardStep() {
    if (wizardStep === "setup") return renderSetupStep();
    if (wizardStep === "upload") return renderUploadStep();
    if (wizardStep === "results") return renderResultsStep();
    return renderFeedbackStep();
  }

  function renderSummaryRail() {
    return (
      <aside className="stack lasercoach-results-rail">
        <section className="panel panel-pad stack">
          <h2>Current setup</h2>
          <div className="lasercoach-kv-grid">
            <div className="kv"><span>Machine</span><span>{machine.name}</span></div>
            <div className="kv"><span>Profile</span><span>{motionProfile.profileName}</span></div>
            <div className="kv"><span>Material</span><span>{material.name}</span></div>
            <div className="kv"><span>Operation</span><span>{operationType}</span></div>
            <div className="kv"><span>Lens</span><span>{format(effectiveLensFocalLengthMm, 1)} mm</span></div>
            <div className="kv"><span>Spot</span><span>{format(numberValue(measuredSpotDiameterMm, 0), 3)} mm</span></div>
            <div className="kv"><span>Source</span><span>{format(effectiveMachine.tubePowerW, 0)} W</span></div>
            <div className="kv"><span>File</span><span>{fileName}</span></div>
          </div>
        </section>

        {recommendation ? (
          <section className="panel panel-pad stack">
            <h2>Latest recommendation</h2>
            <div className="readouts lasercoach-readouts">
              <MetricCard label="Speed" value={`${format(recommendation.recommendedSpeedMmSec, 1)} mm/s`} />
              <MetricCard label="Power" value={`${format(recommendation.recommendedMinPowerPercent, 0)}-${format(recommendation.recommendedMaxPowerPercent, 0)}%`} />
              <MetricCard label="Passes" value={String(recommendation.recommendedPasses)} />
              <MetricCard label="Risk" value={recommendation.geometryRiskLevel} tone={recommendation.geometryRiskLevel === "High" ? "danger" : recommendation.geometryRiskLevel === "Medium" ? "warn" : "ok"} />
            </div>
          </section>
        ) : null}

        <section className="panel panel-pad stack">
          <h2>Correction profile</h2>
          <div className="readouts lasercoach-readouts">
            <MetricCard label="Speed multiplier" value={format(currentCorrection.speedMultiplier, 3)} />
            <MetricCard label="Power bias" value={`${format(currentCorrection.maxPowerBiasPercent, 1)}%`} />
            <MetricCard label="Confidence" value={`${format(currentCorrection.confidenceScore * 100, 0)}%`} />
            <MetricCard label="Samples" value={String(currentCorrection.samplesCount)} />
          </div>
        </section>
      </aside>
    );
  }

  return (
    <main className="app lasercoach-tool">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <LaserCoachIcon />
          </div>
          <div>
            <h1>{TOOL_NAME}</h1>
          </div>
        </div>
        <a className="tool-doc-link" href="/docs/lasercoach">Description</a>
      </header>

      <nav className="wizard-steps lasercoach-wizard-steps" aria-label="Laser recommendation workflow">
        {WIZARD_STEPS.map((step, index) => (
          <button
            className={`wizard-step ${wizardStep === step.id ? "active" : ""}`}
            type="button"
            key={step.id}
            aria-current={wizardStep === step.id ? "step" : undefined}
            onClick={() => setWizardStep(step.id)}
          >
            <span>{index + 1}</span>
            {step.label}
          </button>
        ))}
      </nav>

      <section className="lasercoach-step-layout">
        <section className="stack">
          {renderWizardStep()}
        </section>
        {renderSummaryRail()}
      </section>

      {infoModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setInfoModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{infoModal.title}</h2>
              <button className="button secondary modal-close" type="button" onClick={() => setInfoModal(null)} aria-label="Close">x</button>
            </div>
            <p className="modal-body-text">{infoModal.body}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

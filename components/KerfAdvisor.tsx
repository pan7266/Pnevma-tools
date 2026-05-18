"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { KerfIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { calculateKerfAdvisor } from "@/lib/calculators/kerf";
import {
  DEFAULT_OPTICAL_PROFILE,
  KERF_CALIBRATION_MODES,
  KERF_MATERIALS,
  KERF_OPERATIONS,
  KERF_QUALITY_GOALS,
  KERF_STORAGE_KEYS,
} from "@/lib/data/kerf";
import { buildLocalizedLightBurnNotes, localizedConfidenceExplanation, translateKerfList } from "@/lib/i18n/kerf-result";
import { formatLength, formatNumber } from "@/lib/units/convert";
import { getLocale } from "@/locales";
import type {
  KerfAdvisorInputs,
  KerfAdvisorResult,
  KerfCalibrationMode,
  KerfMaterialFamily,
  KerfOperation,
  KerfQualityGoal,
  OpticalProfile,
  UserMaterialProfile,
} from "@/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function numberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function thicknessStepFor(value: number): number {
  return value < 1 ? 0.1 : 0.5;
}

function roundThickness(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const safe = Math.max(value, 0.01);
  const step = thicknessStepFor(safe);
  return Number((Math.round(safe / step) * step).toFixed(2));
}

function compactProfileSource(profileName: string): string {
  const source = profileName.split("/")[0]?.trim() || profileName;
  return source.length > 34 ? `${source.slice(0, 31)}...` : source;
}

function opticalProfileOptionLabel(profile: OpticalProfile, labels: Record<string, string>): string {
  return `${labels.source} "${compactProfileSource(profile.profileName)}" | ${labels.lensFocalLength} ${formatNumber(profile.lensFocalLengthMm, 1)} mm | ${labels.measuredSpot} ${formatNumber(profile.measuredSpotDiameterMm, 3)}`;
}

function InfoLabel({
  label,
  body,
  onOpen,
}: {
  label: string;
  body: string;
  onOpen: (modal: { title: string; body: string }) => void;
}) {
  return (
    <span className="label-line">
      {label}
      <InfoButton title={label} body={body} onOpen={onOpen} />
    </span>
  );
}

function loadJsonArray<T>(key: string): T[] {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function BeamMaterialGraph({ result, thicknessMm, labels }: { result: KerfAdvisorResult; thicknessMm: number; labels: Record<string, string> }) {
  const width = 760;
  const height = 260;
  const slab = { x: 280, y: 32, w: 190, h: 182 };
  const maxDiameter = Math.max(result.topDiameterMm, result.middleDiameterMm, result.bottomDiameterMm, 0.01);
  const scale = 56 / maxDiameter;
  const focusY = slab.y + clamp(result.recommendedFocusDepthMm / Math.max(thicknessMm, 0.001), -0.28, 1.2) * slab.h;
  const topHalf = clamp((result.topDiameterMm * scale) / 2, 3, 56);
  const midHalf = clamp((result.middleDiameterMm * scale) / 2, 3, 56);
  const bottomHalf = clamp((result.bottomDiameterMm * scale) / 2, 3, 56);
  const cx = slab.x + slab.w / 2;
  const pathLeft = `M${cx - topHalf} ${slab.y} C${cx - midHalf} ${slab.y + slab.h * 0.32} ${cx - 4} ${focusY} ${cx - 3} ${focusY} C${cx - midHalf} ${slab.y + slab.h * 0.68} ${cx - bottomHalf} ${slab.y + slab.h} ${cx - bottomHalf} ${slab.y + slab.h}`;
  const pathRight = `M${cx + topHalf} ${slab.y} C${cx + midHalf} ${slab.y + slab.h * 0.32} ${cx + 4} ${focusY} ${cx + 3} ${focusY} C${cx + midHalf} ${slab.y + slab.h * 0.68} ${cx + bottomHalf} ${slab.y + slab.h} ${cx + bottomHalf} ${slab.y + slab.h}`;

  return (
    <div className="graph-panel kerf-beam-graph">
      <div className="graph-head">
        <div>
          <h2>{labels.beamThroughMaterial}</h2>
          <p>{labels.opticalIndicatorNotice}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.beamThroughMaterial}>
        <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} rx="8" fill="color-mix(in srgb, var(--primary) 8%, var(--panel-solid))" stroke="var(--line)" />
        <line x1={slab.x - 34} x2={slab.x + slab.w + 34} y1={slab.y} y2={slab.y} stroke="var(--axis)" />
        <line x1={slab.x - 34} x2={slab.x + slab.w + 34} y1={slab.y + slab.h} y2={slab.y + slab.h} stroke="var(--axis)" />
        <path d={pathLeft} fill="none" stroke="var(--beam)" strokeWidth="2" />
        <path d={pathRight} fill="none" stroke="var(--beam)" strokeWidth="2" />
        <line x1={cx - 72} x2={cx + 72} y1={focusY} y2={focusY} stroke="var(--green)" strokeDasharray="5 6" />
        <circle cx={cx} cy={focusY} r="5" fill="var(--green)" />
        <text x={slab.x - 52} y={slab.y + 5} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.topSurface}</text>
        <text x={slab.x - 52} y={slab.y + slab.h / 2 + 4} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.middle}</text>
        <text x={slab.x - 52} y={slab.y + slab.h + 5} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.bottomExit}</text>
        <text x={slab.x + slab.w + 48} y={focusY + 4} fill="var(--green)" fontSize="12">{labels.focusDepth}: {result.recommendedFocusDepthMm.toFixed(2)} mm</text>
        <text x={slab.x + slab.w + 48} y={slab.y + 6} fill="var(--muted)" fontSize="11">{result.topDiameterMm.toFixed(4)} mm</text>
        <text x={slab.x + slab.w + 48} y={slab.y + slab.h / 2 + 4} fill="var(--muted)" fontSize="11">{result.middleDiameterMm.toFixed(4)} mm</text>
        <text x={slab.x + slab.w + 48} y={slab.y + slab.h + 5} fill="var(--muted)" fontSize="11">{result.bottomDiameterMm.toFixed(4)} mm</text>
      </svg>
    </div>
  );
}

function RayleighRangeGraph({ profile, labels }: { profile: OpticalProfile; labels: Record<string, string> }) {
  const width = 760;
  const height = 170;
  const centerX = width / 2;
  const axisY = 88;
  const zR = Math.max(profile.rayleighRangeMm, 0.001);
  const confocal = Math.max(profile.confocalParameterMm || zR * 2, zR * 2);
  const w0 = Math.max(profile.waistRadiusMm, profile.measuredSpotDiameterMm / 2, 0.0001);
  const scale = 118 / Math.max(confocal, 0.1);
  const leftZR = centerX - zR * scale;
  const rightZR = centerX + zR * scale;
  const waist = clamp(w0 * 1200, 3, 18);
  return (
    <div className="graph-panel kerf-rayleigh-graph">
      <div className="graph-head">
        <div>
          <h2>{labels.rayleighGraphTitle}</h2>
          <p>{labels.opticalProfileExplain}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.rayleighGraphTitle}>
        <rect width={width} height={height} fill="transparent" />
        <line x1="84" x2={width - 84} y1={axisY} y2={axisY} stroke="var(--axis)" strokeDasharray="5 7" />
        <path d={`M84 ${axisY - 44} C${leftZR} ${axisY - 24} ${centerX - waist} ${axisY - waist} ${centerX} ${axisY - waist} C${centerX + waist} ${axisY - waist} ${rightZR} ${axisY - 24} ${width - 84} ${axisY - 44}`} fill="none" stroke="var(--beam)" strokeWidth="1.7" />
        <path d={`M84 ${axisY + 44} C${leftZR} ${axisY + 24} ${centerX - waist} ${axisY + waist} ${centerX} ${axisY + waist} C${centerX + waist} ${axisY + waist} ${rightZR} ${axisY + 24} ${width - 84} ${axisY + 44}`} fill="none" stroke="var(--beam)" strokeWidth="1.7" />
        <line x1={centerX} x2={centerX} y1="36" y2="140" stroke="var(--green)" strokeWidth="1.4" />
        <line x1={leftZR} x2={leftZR} y1="48" y2="128" stroke="var(--primary)" strokeDasharray="5 6" />
        <line x1={rightZR} x2={rightZR} y1="48" y2="128" stroke="var(--primary)" strokeDasharray="5 6" />
        <text x={centerX} y="30" fill="var(--ink)" fontSize="12" fontWeight="900" textAnchor="middle">waist {profile.measuredSpotDiameterUm.toFixed(1)} µm</text>
        <text x={leftZR} y="148" fill="var(--muted)" fontSize="11" textAnchor="middle">-zR {zR.toFixed(4)} mm</text>
        <text x={rightZR} y="148" fill="var(--muted)" fontSize="11" textAnchor="middle">+zR {zR.toFixed(4)} mm</text>
      </svg>
    </div>
  );
}

function CalibrationModeGraph({ mode, labels }: { mode: KerfCalibrationMode; labels: Record<string, string> }) {
  const width = 520;
  const height = 180;
  const title = labels[mode] || mode;
  const description = labels[`calibrationModeMeaning_${mode}`] || labels.helpCalibrationMode;
  return (
    <div className="graph-panel kerf-calibration-graph">
      <div className="graph-head">
        <div>
          <h2>{labels.calibrationDiagramTitle}</h2>
          <p>{description}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <rect width={width} height={height} fill="transparent" />
        <text x="24" y="28" fill="var(--ink)" fontSize="14" fontWeight="900">{title}</text>
        {mode === "multi_line_strip" ? Array.from({ length: 7 }, (_, index) => (
          <line key={index} x1={110 + index * 32} x2={110 + index * 32} y1="50" y2="142" stroke={index % 2 ? "var(--beam)" : "var(--primary)"} strokeWidth="2" />
        )) : null}
        {mode === "outside_square" ? <rect x="160" y="48" width="150" height="90" fill="none" stroke="var(--beam)" strokeWidth="3" /> : null}
        {mode === "inside_hole" ? <g><rect x="145" y="44" width="170" height="98" fill="none" stroke="var(--line)" /><circle cx="230" cy="93" r="38" fill="none" stroke="var(--beam)" strokeWidth="3" /></g> : null}
        {mode === "slot_tab_fit" ? <g><rect x="110" y="62" width="120" height="54" fill="none" stroke="var(--primary)" strokeWidth="3" /><rect x="280" y="62" width="42" height="54" fill="color-mix(in srgb, var(--green) 22%, transparent)" stroke="var(--green)" strokeWidth="3" /></g> : null}
        {mode === "inlay_fit" ? <g><path d="M168 122v-48h48v-26h72v26h48v48z" fill="none" stroke="var(--beam)" strokeWidth="3" /><path d="M210 113v-32h36v-18h48v18h36v32z" fill="none" stroke="var(--green)" strokeWidth="2" /></g> : null}
        {mode === "focus_ladder" ? [0, 15, 30, 50, 70].map((percent, index) => (
          <g key={percent}>
            <rect x={98 + index * 70} y={58} width="42" height={74} fill="color-mix(in srgb, var(--primary) 8%, transparent)" stroke="var(--line)" />
            <line x1={98 + index * 70} x2={140 + index * 70} y1={58 + (percent / 100) * 74} y2={58 + (percent / 100) * 74} stroke="var(--beam)" strokeWidth="2" />
            <text x={119 + index * 70} y="150" fill="var(--muted)" fontSize="10" textAnchor="middle">{percent}%</text>
          </g>
        )) : null}
      </svg>
    </div>
  );
}

function ThermalSelectionPanel({ operation, qualityGoal, labels }: { operation: KerfOperation; qualityGoal: KerfQualityGoal; labels: Record<string, string> }) {
  const operationMeaning = labels[`operationMeaning_${operation}`] || labels.helpOperation;
  const qualityGoalMeaning = labels[`qualityGoalMeaning_${qualityGoal}`] || labels.helpQualityGoal;
  return (
    <article className="mini-panel thermal-selection-panel">
      <h2>{labels.thermalSelectionTitle}</h2>
      <p className="small"><strong>{labels[operation]}:</strong> {operationMeaning}</p>
      <p className="small"><strong>{labels[qualityGoal]}:</strong> {qualityGoalMeaning}</p>
      <svg viewBox="0 0 520 92" role="img" aria-label={labels.thermalSelectionTitle}>
        <rect x="28" y="38" width="360" height="16" rx="8" fill="url(#kerfHeatGradient)" />
        <defs>
          <linearGradient id="kerfHeatGradient" x1="0" x2="1">
            <stop offset="0" stopColor="var(--green)" />
            <stop offset="0.55" stopColor="var(--amber)" />
            <stop offset="1" stopColor="var(--beam)" />
          </linearGradient>
        </defs>
        <text x="28" y="74" fill="var(--muted)" fontSize="11">{labels.clean_top_edge}</text>
        <text x="388" y="74" fill="var(--muted)" fontSize="11" textAnchor="end">{labels.clean_bottom_exit}</text>
        <circle cx={qualityGoal === "clean_bottom_exit" ? 330 : qualityGoal === "fast_production" ? 360 : qualityGoal === "minimum_taper" ? 220 : 120} cy="46" r="8" fill="var(--ink)" />
      </svg>
    </article>
  );
}

export function KerfAdvisor() {
  const { lang, unitSystem } = useAppSettings();
  const labels = useMemo(() => getLocale(lang).kerf, [lang]);
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<OpticalProfile[]>([DEFAULT_OPTICAL_PROFILE]);
  const [customProfiles, setCustomProfiles] = useState<UserMaterialProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_OPTICAL_PROFILE.id);
  const [materialId, setMaterialId] = useState(KERF_MATERIALS[0].id);
  const [family, setFamily] = useState<KerfMaterialFamily>("cast_acrylic");
  const [subtype, setSubtype] = useState("cast_acrylic");
  const [thicknessMm, setThicknessMm] = useState(6);
  const [operation, setOperation] = useState<KerfOperation>("cut_through");
  const [qualityGoal, setQualityGoal] = useState<KerfQualityGoal>("clean_bottom_exit");
  const [airAssist, setAirAssist] = useState<"off" | "low" | "medium" | "high">("medium");
  const [extraction, setExtraction] = useState(true);
  const [calibrationMode, setCalibrationMode] = useState<KerfCalibrationMode>("focus_ladder");
  const [topKerf, setTopKerf] = useState("");
  const [bottomKerf, setBottomKerf] = useState("");
  const [averageKerf, setAverageKerf] = useState("");
  const [designedWidth, setDesignedWidth] = useState("");
  const [measuredWidth, setMeasuredWidth] = useState("");
  const [cutLines, setCutLines] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const savedProfiles = loadJsonArray<OpticalProfile>(KERF_STORAGE_KEYS.opticalProfiles);
    setProfiles(savedProfiles.length ? savedProfiles : [DEFAULT_OPTICAL_PROFILE]);
    if (savedProfiles[0]) setSelectedProfileId(savedProfiles[0].id);
    setCustomProfiles(loadJsonArray<UserMaterialProfile>(KERF_STORAGE_KEYS.materialProfiles));
  }, []);

  const selectedMaterial = KERF_MATERIALS.find((material) => material.id === materialId) || KERF_MATERIALS[0];
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0] || DEFAULT_OPTICAL_PROFILE;
  const inputs: KerfAdvisorInputs = {
    opticalProfile: selectedProfile,
    materialId,
    family,
    subtype,
    thicknessMm,
    operation,
    qualityGoal,
    airAssist,
    extraction,
    topKerfMm: numberOrUndefined(topKerf),
    bottomKerfMm: numberOrUndefined(bottomKerf),
    averageKerfMm: numberOrUndefined(averageKerf),
    calibrationMode,
    calibration: {
      designedWidthMm: numberOrUndefined(designedWidth),
      measuredWidthMm: numberOrUndefined(measuredWidth),
      numberOfCutLines: numberOrUndefined(cutLines),
    },
  };
  const result = useMemo(() => calculateKerfAdvisor(inputs), [inputs]);
  const confidenceExplanation = useMemo(() => localizedConfidenceExplanation(result, labels), [result, labels]);
  const lightBurnNotes = useMemo(() => buildLocalizedLightBurnNotes(result, inputs, labels), [result, inputs, labels]);
  const steps = [
    { key: "optical", label: labels.stepOptical },
    { key: "material", label: labels.stepMaterial },
    { key: "operation", label: labels.stepOperation },
    { key: "calibration", label: labels.stepCalibration },
    { key: "export", label: labels.stepExport },
  ] as const;
  const activeStep = steps[step]?.key || "optical";
  const thicknessStep = thicknessStepFor(thicknessMm);
  const help = (key: string, fallback: string) => labels[key] || fallback;

  function chooseMaterial(nextId: string) {
    const material = KERF_MATERIALS.find((item) => item.id === nextId) || KERF_MATERIALS[0];
    setMaterialId(nextId);
    setFamily(material.family);
    setSubtype(material.subtypes[0] || material.family);
    setThicknessMm(material.thicknessesMm[0] || 3);
  }

  function saveProfile() {
    const now = new Date().toISOString();
    const profile: UserMaterialProfile = {
      id: `kerf-${Date.now()}`,
      name: `${labels[family] || family} ${thicknessMm} mm ${labels[operation] || operation}`,
      baseMaterialId: materialId,
      family,
      subtype,
      thicknessMm,
      opticalProfileId: selectedProfile.id,
      operation,
      qualityGoal,
      recommendedFocusDepthMm: result.recommendedFocusDepthMm,
      acceptableFocusMinMm: result.acceptableFocusMinMm,
      acceptableFocusMaxMm: result.acceptableFocusMaxMm,
      measuredKerfMm: result.measuredKerfMm,
      topKerfMm: numberOrUndefined(topKerf),
      bottomKerfMm: numberOrUndefined(bottomKerf),
      averageKerfMm: numberOrUndefined(averageKerf),
      airAssist,
      confidence: result.confidence,
      notes: [...result.warnings, ...result.expectedRisks],
      createdAt: now,
      updatedAt: now,
    };
    const next = [profile, ...customProfiles];
    setCustomProfiles(next);
    window.localStorage.setItem(KERF_STORAGE_KEYS.materialProfiles, JSON.stringify(next));
    setJsonData(JSON.stringify(next, null, 2));
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonData) as UserMaterialProfile[];
      if (!Array.isArray(parsed)) return;
      setCustomProfiles(parsed);
      window.localStorage.setItem(KERF_STORAGE_KEYS.materialProfiles, JSON.stringify(parsed));
    } catch {
      setJsonData("");
    }
  }

  return (
    <main className="app kerf-tool">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><KerfIcon /></div>
          <div>
            <h1>{labels.title}</h1>
            <p className="subhead">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="panel panel-pad kerf-wizard">
        <nav className="wizard-steps" aria-label={labels.title}>
          {steps.map((item, index) => (
            <button key={item.key} className={`wizard-step ${step === index ? "active" : ""}`} type="button" onClick={() => setStep(index)}>
              <span>{index + 1}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="kerf-grid">
          <aside className="stack">
            {activeStep === "optical" ? (
              <section className="mini-panel">
                <h2>{labels.opticalProfile}</h2>
                <label>
                  <InfoLabel label={labels.opticalProfile} body={help("helpOpticalProfile", labels.importProfile)} onOpen={setInfoModal} />
                  <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{opticalProfileOptionLabel(profile, labels)}</option>)}
                  </select>
                  <span className="field-hint">{profiles.length ? labels.importProfile : labels.noProfile}</span>
                </label>
                <div className="kv"><span>{labels.lensFocalLength}</span><span>{formatLength(selectedProfile.lensFocalLengthMm, unitSystem, 2)}</span></div>
                <div className="kv"><span>{labels.measuredSpot}</span><span>{formatLength(selectedProfile.measuredSpotDiameterMm, unitSystem, 4)}</span></div>
                <div className="kv"><span>{labels.rayleigh}</span><span>{formatLength(selectedProfile.rayleighRangeMm, unitSystem, 4)}</span></div>
                <p className="small">{labels.opticalProfileExplain}</p>
                <p className="small">{labels.measuredKerfExplain}</p>
              </section>
            ) : null}

            {activeStep === "material" ? (
              <section className="mini-panel">
                <h2>{labels.materialPreset}</h2>
                <label>
                  <InfoLabel label={labels.materialPreset} body={help("helpMaterialPreset", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                  <select value={materialId} onChange={(event) => chooseMaterial(event.target.value)}>
                    {KERF_MATERIALS.map((material) => <option key={material.id} value={material.id}>{labels[material.labelKey]}</option>)}
                  </select>
                </label>
                <label>
                  <InfoLabel label={labels.subtype} body={help("helpSubtype", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                  <select value={subtype} onChange={(event) => {
                    const next = event.target.value as KerfMaterialFamily;
                    setSubtype(next);
                    if (["cast_acrylic", "xt_acrylic", "mirror_acrylic", "birch_plywood", "ilomba_plywood", "mdf", "paper_cardstock", "leather", "fabric", "nonwoven", "unknown_plastic"].includes(next)) setFamily(next);
                  }}>
                    {selectedMaterial.subtypes.map((item) => <option key={item} value={item}>{labels[item] || item}</option>)}
                  </select>
                </label>
                <label>
                  <InfoLabel label={`${labels.thickness} (mm)`} body={help("helpThickness", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                  <input type="number" min="0.01" step={thicknessStep} value={thicknessMm} onChange={(event) => setThicknessMm(Number(event.target.value))} onBlur={() => setThicknessMm((current) => roundThickness(current))} />
                </label>
              </section>
            ) : null}

            {activeStep === "operation" ? (
              <section className="mini-panel">
                <h2>{labels.operation}</h2>
                <label>
                  <InfoLabel label={labels.operation} body={help("helpOperation", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                  <select value={operation} onChange={(event) => setOperation(event.target.value as KerfOperation)}>
                    {KERF_OPERATIONS.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                  </select>
                </label>
                <label>
                  <InfoLabel label={labels.qualityGoal} body={help("helpQualityGoal", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                  <select value={qualityGoal} onChange={(event) => setQualityGoal(event.target.value as KerfQualityGoal)}>
                    {KERF_QUALITY_GOALS.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                  </select>
                </label>
                <div className="field-row compact-row">
                  <label>
                    <InfoLabel label={labels.airAssist} body={help("helpAirAssist", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={airAssist} onChange={(event) => setAirAssist(event.target.value as "off" | "low" | "medium" | "high")}>
                      {["off", "low", "medium", "high"].map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                    </select>
                  </label>
                  <label>
                    <InfoLabel label={labels.extraction} body={help("helpExtraction", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={extraction ? "on" : "off"} onChange={(event) => setExtraction(event.target.value === "on")}>
                      <option value="on">{labels.extractionOn}</option>
                      <option value="off">{labels.extractionOff}</option>
                    </select>
                  </label>
                </div>
                <ThermalSelectionPanel operation={operation} qualityGoal={qualityGoal} labels={labels} />
              </section>
            ) : null}

            {activeStep === "calibration" ? (
              <section className="mini-panel">
                <h2>{labels.calibrationMode}</h2>
                <label>
                  <InfoLabel label={labels.calibrationMode} body={help("helpCalibrationMode", labels.calibrationTest)} onOpen={setInfoModal} />
                  <select value={calibrationMode} onChange={(event) => setCalibrationMode(event.target.value as KerfCalibrationMode)}>
                    {KERF_CALIBRATION_MODES.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                  </select>
                  <span className="field-hint">{labels[`calibrationModeMeaning_${calibrationMode}`] || labels.helpCalibrationMode}</span>
                </label>
                <div className="field-row compact-row">
                  <label><InfoLabel label={`${labels.topKerf} (mm)`} body={help("helpTopKerf", labels.measuredKerf)} onOpen={setInfoModal} /><input type="number" step="0.001" value={topKerf} onChange={(event) => setTopKerf(event.target.value)} /></label>
                  <label><InfoLabel label={`${labels.bottomKerf} (mm)`} body={help("helpBottomKerf", labels.measuredKerf)} onOpen={setInfoModal} /><input type="number" step="0.001" value={bottomKerf} onChange={(event) => setBottomKerf(event.target.value)} /></label>
                </div>
                <label><InfoLabel label={`${labels.averageKerf} (mm)`} body={help("helpAverageKerf", labels.measuredKerf)} onOpen={setInfoModal} /><input type="number" step="0.001" value={averageKerf} onChange={(event) => setAverageKerf(event.target.value)} /></label>
                <div className="field-row compact-row">
                  <label><InfoLabel label={`${labels.designedWidth} (mm)`} body={help("helpDesignedWidth", labels.calibrationTest)} onOpen={setInfoModal} /><input type="number" step="0.01" value={designedWidth} onChange={(event) => setDesignedWidth(event.target.value)} /></label>
                  <label><InfoLabel label={`${labels.measuredWidth} (mm)`} body={help("helpMeasuredWidth", labels.calibrationTest)} onOpen={setInfoModal} /><input type="number" step="0.01" value={measuredWidth} onChange={(event) => setMeasuredWidth(event.target.value)} /></label>
                  <label><InfoLabel label={labels.cutLines} body={help("helpCutLines", labels.calibrationTest)} onOpen={setInfoModal} /><input type="number" step="1" value={cutLines} onChange={(event) => setCutLines(event.target.value)} /></label>
                </div>
                <CalibrationModeGraph mode={calibrationMode} labels={labels} />
              </section>
            ) : null}

            {activeStep === "export" ? (
              <section className="mini-panel">
                <h2>{labels.savedProfiles}</h2>
                <div className="button-row">
                  <button className="button" type="button" onClick={saveProfile}>{labels.saveProfile}</button>
                  <button className="button secondary" type="button" onClick={() => setJsonData(JSON.stringify(customProfiles, null, 2))}>{labels.exportJson}</button>
                  <button className="button secondary" type="button" onClick={importJson}>{labels.importJson}</button>
                </div>
                <label>
                  <InfoLabel label={labels.jsonData} body={help("helpJsonData", labels.localStorageNote)} onOpen={setInfoModal} />
                  <textarea value={jsonData} onChange={(event) => setJsonData(event.target.value)} />
                </label>
                <p className="small">{labels.localStorageNote}</p>
              </section>
            ) : null}
          </aside>

          <section className="stack">
            {result.blocked ? <div className="error">{labels.unknownPlasticBlocked}</div> : null}
            <div className="readouts">
              <MetricCard label={labels.focusDepth} value={`${formatNumber(result.recommendedFocusDepthMm, 3)} mm`} sub={`${formatNumber(result.recommendedFocusPercent, 1)}% · ${labels[result.placementLabelKey]}`} tone={result.blocked ? "danger" : "ok"} />
              <MetricCard label={labels.focusRange} value={`${formatNumber(result.acceptableFocusMinMm, 2)} - ${formatNumber(result.acceptableFocusMaxMm, 2)} mm`} sub={`${formatNumber(result.acceptableFocusMinPercent, 1)}% - ${formatNumber(result.acceptableFocusMaxPercent, 1)}%`} />
              <MetricCard label={labels.opticalTaper} value={labels[result.opticalTaperTendency]} sub={`${labels.symmetryError}: ${formatNumber(result.opticalSymmetryError * 100, 1)}%`} tone={result.opticalTaperTendency === "high" ? "warn filled" : "ok"} />
              <MetricCard label={labels.confidence} value={`${labels[result.confidence]} ${formatNumber(result.confidenceScore, 0)}/100`} sub={confidenceExplanation} />
            </div>
            {activeStep === "optical" ? <RayleighRangeGraph profile={selectedProfile} labels={labels} /> : null}
            <div className="panels kerf-explain-grid">
              <article className="mini-panel"><h2>{labels.focusDepth}</h2><p className="small">{labels.focusDepthExplain}</p></article>
              <article className="mini-panel"><h2>{labels.opticalTaper}</h2><p className="small">{labels.opticalTaperExplain}</p></article>
              <article className="mini-panel"><h2>{labels.confidenceExplainTitle}</h2><p className="small">{labels.confidenceExplainBody}</p></article>
            </div>
            <BeamMaterialGraph result={result} thicknessMm={thicknessMm} labels={labels} />
            <div className="panels kerf-panels">
              <article className="mini-panel">
                <h2>{labels.expectedKerf}</h2>
                {translateKerfList(result.expectedKerfBehavior, labels).map((item) => <p className="small" key={item}>{item}</p>)}
              </article>
              <article className="mini-panel">
                <h2>{labels.benefits}</h2>
                {translateKerfList(result.expectedBenefits, labels).map((item) => <p className="small" key={item}>{item}</p>)}
              </article>
              <article className="mini-panel warn">
                <h2>{labels.risks}</h2>
                {translateKerfList([...result.expectedRisks, ...result.warnings], labels).map((item) => <p className="small" key={item}>{item}</p>)}
              </article>
            </div>
            <div className="panel panel-pad">
              <h2 className="label-line">
                {labels.lightBurnNotes}
                <InfoButton title={labels.lightBurnNotes} body={help("helpLightBurnNotes", labels.calibrationTest)} onOpen={setInfoModal} />
              </h2>
              <textarea className="notes-output" readOnly value={lightBurnNotes} />
              <button className="button secondary" type="button" onClick={() => navigator.clipboard?.writeText(lightBurnNotes)}>{labels.copyNotes}</button>
            </div>
          </section>
        </div>
      </section>

      {infoModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setInfoModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{infoModal.title}</h2>
              <button className="button secondary modal-close" type="button" onClick={() => setInfoModal(null)} aria-label={labels.close}>x</button>
            </div>
            <p className="modal-body-text">{infoModal.body}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

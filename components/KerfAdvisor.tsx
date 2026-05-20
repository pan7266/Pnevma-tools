"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { KerfIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { NumberInput } from "@/components/ui/NumberInput";
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
  return 0.01;
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
  const lensY = 10;
  const lensHalf = 34;
  const beyondExitY = slab.y + slab.h + 20;
  const focusLineY = clamp(focusY, lensY + 12, beyondExitY - 8);
  const topHalf = clamp((result.topDiameterMm * scale) / 2, 3, 56);
  const bottomHalf = clamp((result.bottomDiameterMm * scale) / 2, 3, 56);
  const exitHalf = clamp(bottomHalf * 1.1, 4, 62);
  const cx = slab.x + slab.w / 2;
  const leftPoints = `${cx - lensHalf},${lensY} ${cx - topHalf},${slab.y} ${cx - 4},${focusLineY} ${cx - bottomHalf},${slab.y + slab.h} ${cx - exitHalf},${beyondExitY}`;
  const rightPoints = `${cx + lensHalf},${lensY} ${cx + topHalf},${slab.y} ${cx + 4},${focusLineY} ${cx + bottomHalf},${slab.y + slab.h} ${cx + exitHalf},${beyondExitY}`;

  return (
    <div className="graph-panel kerf-beam-graph">
      <div className="graph-head">
        <div>
          <h2>{labels.beamThroughMaterial}</h2>
          <p>{labels.opticalIndicatorNotice}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.beamThroughMaterial}>
        <line x1={cx - lensHalf} x2={cx + lensHalf} y1={lensY} y2={lensY} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <text x={cx} y={lensY + 18} fill="var(--muted)" fontSize="11" textAnchor="middle">{labels.lensFocalLength}</text>
        <rect x={slab.x} y={slab.y} width={slab.w} height={slab.h} rx="8" fill="color-mix(in srgb, var(--primary) 8%, var(--panel-solid))" stroke="var(--line)" />
        <line x1={slab.x - 34} x2={slab.x + slab.w + 34} y1={slab.y} y2={slab.y} stroke="var(--axis)" />
        <line x1={slab.x - 34} x2={slab.x + slab.w + 34} y1={slab.y + slab.h} y2={slab.y + slab.h} stroke="var(--axis)" />
        <polyline points={leftPoints} fill="none" stroke="var(--beam)" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={rightPoints} fill="none" stroke="var(--beam)" strokeWidth="2" strokeLinejoin="round" />
        <line x1={cx - 72} x2={cx + 72} y1={focusLineY} y2={focusLineY} stroke="var(--green)" strokeDasharray="5 6" />
        <circle cx={cx} cy={focusLineY} r="5" fill="var(--green)" />
        <text x={slab.x - 52} y={slab.y + 5} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.topSurface}</text>
        <text x={slab.x - 52} y={slab.y + slab.h / 2 + 4} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.middle}</text>
        <text x={slab.x - 52} y={slab.y + slab.h + 5} fill="var(--ink)" fontSize="12" textAnchor="end">{labels.bottomExit}</text>
        <text x={slab.x + slab.w + 48} y={focusLineY + 4} fill="var(--green)" fontSize="12">{labels.focusDepth}: {result.recommendedFocusDepthMm.toFixed(2)} mm</text>
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

function ThermalSelectionPanel({
  operation,
  qualityGoal,
  labels,
  onOperationSelect,
  onQualityGoalSelect,
}: {
  operation: KerfOperation | "";
  qualityGoal: KerfQualityGoal | "";
  labels: Record<string, string>;
  onOperationSelect: (operation: KerfOperation) => void;
  onQualityGoalSelect: (qualityGoal: KerfQualityGoal) => void;
}) {
  const operationMeaning = operation ? labels[`operationMeaning_${operation}`] || labels.helpOperation : "";
  const qualityGoalMeaning = qualityGoal ? labels[`qualityGoalMeaning_${qualityGoal}`] || labels.helpQualityGoal : "";
  return (
    <details className="mini-panel thermal-selection-panel">
      <summary>{labels.thermalSelectionTitle}</summary>
      {operation || qualityGoal ? (
        <div className="selection-summary-grid">
          {operation ? <p className="small"><strong>{labels[operation]}:</strong> {operationMeaning}</p> : null}
          {qualityGoal ? <p className="small"><strong>{labels[qualityGoal]}:</strong> {qualityGoalMeaning}</p> : null}
        </div>
      ) : null}
      <div className="selection-reference-grid">
        <section>
          <h3>{labels.operation}</h3>
          <ul>
            {KERF_OPERATIONS.map((item) => (
              <li key={item} className={operation === item ? "active" : undefined}>
                <button type="button" className="selection-reference-button" onClick={() => onOperationSelect(item)}>
                  <strong>{labels[item]}</strong>
                  <span>{labels[`operationMeaning_${item}`] || labels.helpOperation}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{labels.qualityGoal}</h3>
          <ul>
            {KERF_QUALITY_GOALS.map((item) => (
              <li key={item} className={`${qualityGoal === item ? "active" : ""} ${!operation ? "disabled" : ""}`}>
                <button type="button" className="selection-reference-button" disabled={!operation} onClick={() => onQualityGoalSelect(item)}>
                  <strong>{labels[item]}</strong>
                  <span>{labels[`qualityGoalMeaning_${item}`] || labels.helpQualityGoal}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {qualityGoal ? (
        <svg viewBox="0 0 520 74" role="img" aria-label={labels.thermalSelectionTitle}>
          <rect x="28" y="28" width="360" height="14" rx="7" fill="url(#kerfHeatGradient)" />
          <defs>
            <linearGradient id="kerfHeatGradient" x1="0" x2="1">
              <stop offset="0" stopColor="var(--green)" />
              <stop offset="0.55" stopColor="var(--amber)" />
              <stop offset="1" stopColor="var(--beam)" />
            </linearGradient>
          </defs>
          <text x="28" y="61" fill="var(--muted)" fontSize="10">{labels.clean_top_edge}</text>
          <text x="388" y="61" fill="var(--muted)" fontSize="10" textAnchor="end">{labels.clean_bottom_exit}</text>
          <circle cx={qualityGoal === "clean_bottom_exit" ? 330 : qualityGoal === "fast_production" ? 360 : qualityGoal === "minimum_taper" ? 220 : 120} cy="35" r="7" fill="var(--ink)" />
        </svg>
      ) : null}
    </details>
  );
}

type RequiredFieldItem = { label: string; complete: boolean; optional?: boolean; target?: string };

function RequiredFieldsPanel({ items, labels, onJump }: { items: RequiredFieldItem[]; labels: Record<string, string>; onJump: (target: string) => void }) {
  const missing = items.filter((item) => !item.complete && !item.optional);
  return (
    <section className="mini-panel required-fields-panel">
      <h2>{labels.requiredFields || "Required fields"}</h2>
      <p className="small">{missing.length ? (labels.requiredFieldsBody || "Complete these fields to show the focus recommendation.") : (labels.requiredFieldsComplete || "Required fields are complete.")}</p>
      <ul>
        {items.map((item) => (
          <li key={item.label} className={item.complete ? "complete" : item.optional ? "optional" : "missing"}>
            <button type="button" className="required-field-button" disabled={item.complete || item.optional || !item.target} onClick={() => item.target && onJump(item.target)}>
              <span>{item.complete ? "OK" : item.optional ? "-" : "!"}</span>
              {item.label}
              {item.optional ? <small>{labels.optional || "optional"}</small> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KerfAdvisor() {
  const { lang, unitSystem } = useAppSettings();
  const labels = useMemo(() => getLocale(lang).kerf, [lang]);
  const [profiles, setProfiles] = useState<OpticalProfile[]>([DEFAULT_OPTICAL_PROFILE]);
  const [customProfiles, setCustomProfiles] = useState<UserMaterialProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_OPTICAL_PROFILE.id);
  const [materialId, setMaterialId] = useState("");
  const [family, setFamily] = useState<KerfMaterialFamily>("cast_acrylic");
  const [subtype, setSubtype] = useState("");
  const [thicknessMm, setThicknessMm] = useState(6);
  const [operation, setOperation] = useState<KerfOperation | "">("");
  const [qualityGoal, setQualityGoal] = useState<KerfQualityGoal | "">("");
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
  const [highlightedField, setHighlightedField] = useState("");
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const savedProfiles = loadJsonArray<OpticalProfile>(KERF_STORAGE_KEYS.opticalProfiles);
    setProfiles(savedProfiles.length ? savedProfiles : [DEFAULT_OPTICAL_PROFILE]);
    if (savedProfiles[0]) setSelectedProfileId(savedProfiles[0].id);
    setCustomProfiles(loadJsonArray<UserMaterialProfile>(KERF_STORAGE_KEYS.materialProfiles));
  }, []);

  useEffect(() => {
    if (!infoModal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setInfoModal(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [infoModal]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const selectedMaterial = KERF_MATERIALS.find((material) => material.id === materialId) || KERF_MATERIALS[0];
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0] || DEFAULT_OPTICAL_PROFILE;
  const validThickness = Number.isFinite(thicknessMm) && thicknessMm > 0;
  const resultReady = Boolean(selectedProfileId && materialId && subtype && operation && qualityGoal && validThickness);
  const effectiveOperation = (operation || "cut_through") as KerfOperation;
  const effectiveQualityGoal = (qualityGoal || "clean_bottom_exit") as KerfQualityGoal;
  const selectSubtypeLabel = labels.selectSubtype || `Select ${labels.subtype.toLowerCase()}`;
  const selectQualityGoalLabel = labels.selectQualityGoal || `Select ${labels.qualityGoal.toLowerCase()}`;
  const selectOperationFirstLabel = labels.selectOperationFirst || labels.selectOperation;
  const advancedLabel = labels.advanced || "Advanced";
  const inputs: KerfAdvisorInputs = {
    opticalProfile: selectedProfile,
    materialId,
    family,
    subtype: subtype || undefined,
    thicknessMm,
    operation: effectiveOperation,
    qualityGoal: effectiveQualityGoal,
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
  const result = useMemo(() => resultReady ? calculateKerfAdvisor(inputs) : null, [inputs, resultReady]);
  const confidenceExplanation = useMemo(() => result ? localizedConfidenceExplanation(result, labels) : "", [result, labels]);
  const lightBurnNotes = useMemo(() => result ? buildLocalizedLightBurnNotes(result, inputs, labels) : "", [result, inputs, labels]);
  const thicknessStep = thicknessStepFor(thicknessMm);
  const help = (key: string, fallback: string) => labels[key] || fallback;
  const requiredFields = [
    { label: labels.opticalProfile, complete: Boolean(selectedProfileId), target: "optical-profile" },
    { label: labels.materialPreset, complete: Boolean(materialId), target: "material-preset" },
    { label: labels.subtype, complete: Boolean(subtype), target: "subtype" },
    { label: `${labels.thickness} (mm)`, complete: validThickness, target: "thickness" },
    { label: labels.operation, complete: Boolean(operation), target: "operation" },
    { label: labels.qualityGoal, complete: Boolean(qualityGoal), target: "quality-goal" },
    { label: labels.airAssist, complete: true, optional: true },
    { label: labels.extraction, complete: extraction, optional: true },
  ];

  function fieldClass(target: string) {
    return `field-control ${highlightedField === target ? "required-target-highlight" : ""}`;
  }

  function jumpToRequiredField(target: string) {
    setHighlightedField(target);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedField(""), 2200);
    window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-required-field="${target}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      const control = element?.querySelector<HTMLElement>("select, input, textarea, button");
      control?.focus();
    });
  }

  function chooseMaterial(nextId: string) {
    if (!nextId) {
      setMaterialId("");
      setFamily("cast_acrylic");
      setSubtype("");
      return;
    }
    const material = KERF_MATERIALS.find((item) => item.id === nextId) || KERF_MATERIALS[0];
    setMaterialId(nextId);
    setFamily(material.family);
    setSubtype("");
    setThicknessMm(material.thicknessesMm[0] || 3);
  }

  function chooseOperation(nextOperation: KerfOperation | "") {
    setOperation(nextOperation);
    if (!nextOperation) setQualityGoal("");
  }

  function saveProfile() {
    if (!result || !operation || !materialId) return;
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
      qualityGoal: effectiveQualityGoal,
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

      <section className="panel panel-pad kerf-workbench">
        <div className="kerf-grid">
          <aside className="stack">
              <section className="mini-panel">
                <h2>{labels.opticalProfile}</h2>
                <div className={fieldClass("optical-profile")} data-required-field="optical-profile">
                  <InfoLabel label={labels.opticalProfile} body={help("helpOpticalProfile", labels.importProfile)} onOpen={setInfoModal} />
                  <select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)}>
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{opticalProfileOptionLabel(profile, labels)}</option>)}
                  </select>
                </div>
                <details className="nested-details">
                  <summary>{labels.profileDetails}</summary>
                  <span className="field-hint">{profiles.length ? labels.importProfile : labels.noProfile}</span>
                  <div className="kv"><span>{labels.lensFocalLength}</span><span>{formatLength(selectedProfile.lensFocalLengthMm, unitSystem, 2)}</span></div>
                  <div className="kv"><span>{labels.measuredSpot}</span><span>{formatLength(selectedProfile.measuredSpotDiameterMm, unitSystem, 4)}</span></div>
                  <div className="kv"><span>{labels.rayleigh}</span><span>{formatLength(selectedProfile.rayleighRangeMm, unitSystem, 4)}</span></div>
                  <p className="small">{labels.opticalProfileExplain}</p>
                  <p className="small">{labels.measuredKerfExplain}</p>
                  <RayleighRangeGraph profile={selectedProfile} labels={labels} />
                </details>
              </section>

              <section className="mini-panel">
                <h2>{labels.materialPreset}</h2>
                <div className="kerf-three-column-row">
                  <div className={fieldClass("material-preset")} data-required-field="material-preset">
                    <InfoLabel label={labels.materialPreset} body={help("helpMaterialPreset", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={materialId} onChange={(event) => chooseMaterial(event.target.value)}>
                      <option value="">{labels.selectMaterial}</option>
                      {KERF_MATERIALS.map((material) => <option key={material.id} value={material.id}>{labels[material.labelKey]}</option>)}
                    </select>
                  </div>
                  <div className={fieldClass("subtype")} data-required-field="subtype">
                    <InfoLabel label={labels.subtype} body={help("helpSubtype", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={subtype} disabled={!materialId} onChange={(event) => {
                      const next = event.currentTarget.value as KerfMaterialFamily | "";
                      setSubtype(next);
                      if (next && ["cast_acrylic", "xt_acrylic", "mirror_acrylic", "birch_plywood", "ilomba_plywood", "mdf", "paper_cardstock", "leather", "fabric", "nonwoven", "unknown_plastic"].includes(next)) setFamily(next);
                    }}>
                      <option value="">{materialId ? selectSubtypeLabel : labels.selectMaterial}</option>
                      {materialId ? selectedMaterial.subtypes.map((item) => <option key={item} value={item}>{labels[item] || item}</option>) : null}
                    </select>
                  </div>
                  <div className={fieldClass("thickness")} data-required-field="thickness">
                    <InfoLabel label={`${labels.thickness} (mm)`} body={help("helpThickness", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <NumberInput min="0.01" step={thicknessStep} value={Number.isFinite(thicknessMm) ? thicknessMm : ""} onValueChange={(value) => setThicknessMm(value === "" ? Number.NaN : Number(value))} onBlur={() => setThicknessMm((current) => roundThickness(current))} />
                  </div>
                </div>
              </section>

              <section className="mini-panel">
                <h2>{labels.operation}</h2>
                <div className="kerf-three-column-row">
                  <div className={fieldClass("operation")} data-required-field="operation">
                    <InfoLabel label={labels.operation} body={help("helpOperation", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={operation} onChange={(event) => chooseOperation(event.target.value as KerfOperation | "")}>
                      <option value="">{labels.selectOperation}</option>
                      {KERF_OPERATIONS.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                    </select>
                  </div>
                  <div className={fieldClass("quality-goal")} data-required-field="quality-goal">
                    <InfoLabel label={labels.qualityGoal} body={help("helpQualityGoal", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={qualityGoal} disabled={!operation} onChange={(event) => setQualityGoal(event.target.value as KerfQualityGoal | "")}>
                      <option value="">{operation ? selectQualityGoalLabel : selectOperationFirstLabel}</option>
                      {operation ? KERF_QUALITY_GOALS.map((item) => <option key={item} value={item}>{labels[item]}</option>) : null}
                    </select>
                  </div>
                  <div className="field-control">
                    <InfoLabel label={labels.airAssist} body={help("helpAirAssist", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                    <select value={airAssist} onChange={(event) => setAirAssist(event.target.value as "off" | "low" | "medium" | "high")}>
                      {["off", "low", "medium", "high"].map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="check-label extraction-check-row">
                  <input type="checkbox" checked={extraction} onChange={(event) => setExtraction(event.target.checked)} />
                  <InfoLabel label={labels.extraction} body={help("helpExtraction", labels.opticalIndicatorNotice)} onOpen={setInfoModal} />
                </div>
                <ThermalSelectionPanel operation={operation} qualityGoal={qualityGoal} labels={labels} onOperationSelect={chooseOperation} onQualityGoalSelect={setQualityGoal} />
              </section>

              <details className="mini-panel advanced-kerf-section">
                <summary>{advancedLabel}</summary>
                <div className="field-control">
                  <InfoLabel label={labels.calibrationMode} body={help("helpCalibrationMode", labels.calibrationTest)} onOpen={setInfoModal} />
                  <select value={calibrationMode} onChange={(event) => setCalibrationMode(event.target.value as KerfCalibrationMode)}>
                    {KERF_CALIBRATION_MODES.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
                  </select>
                  <span className="field-hint">{labels[`calibrationModeMeaning_${calibrationMode}`] || labels.helpCalibrationMode}</span>
                </div>
                <div className="field-row compact-row">
                  <div className="field-control"><InfoLabel label={`${labels.topKerf} (mm)`} body={help("helpTopKerf", labels.measuredKerf)} onOpen={setInfoModal} /><NumberInput step="0.001" value={topKerf} onValueChange={setTopKerf} /></div>
                  <div className="field-control"><InfoLabel label={`${labels.bottomKerf} (mm)`} body={help("helpBottomKerf", labels.measuredKerf)} onOpen={setInfoModal} /><NumberInput step="0.001" value={bottomKerf} onValueChange={setBottomKerf} /></div>
                </div>
                <div className="field-control"><InfoLabel label={`${labels.averageKerf} (mm)`} body={help("helpAverageKerf", labels.measuredKerf)} onOpen={setInfoModal} /><NumberInput step="0.001" value={averageKerf} onValueChange={setAverageKerf} /></div>
                <div className="field-row compact-row">
                  <div className="field-control"><InfoLabel label={`${labels.designedWidth} (mm)`} body={help("helpDesignedWidth", labels.calibrationTest)} onOpen={setInfoModal} /><NumberInput step="0.01" value={designedWidth} onValueChange={setDesignedWidth} /></div>
                  <div className="field-control"><InfoLabel label={`${labels.measuredWidth} (mm)`} body={help("helpMeasuredWidth", labels.calibrationTest)} onOpen={setInfoModal} /><NumberInput step="0.01" value={measuredWidth} onValueChange={setMeasuredWidth} /></div>
                  <div className="field-control"><InfoLabel label={labels.cutLines} body={help("helpCutLines", labels.calibrationTest)} onOpen={setInfoModal} /><NumberInput step="1" value={cutLines} onValueChange={setCutLines} /></div>
                </div>
                <CalibrationModeGraph mode={calibrationMode} labels={labels} />
                <article className="info-box better-results-panel">
                  <h2>{labels.betterResultsTitle}</h2>
                  <p className="small"><strong>{labels.betterKerfCalibration}</strong> {labels.betterKerfCalibrationBody}</p>
                  <p className="small"><strong>{labels.betterAlignmentTest}</strong> {labels.alignmentNineSpotTest}</p>
                </article>
              </details>

              <section className="mini-panel">
                <h2>{labels.savedProfiles}</h2>
                <div className="button-row">
                  <button className="button" type="button" onClick={saveProfile} disabled={!result}>{labels.saveProfile}</button>
                  <button className="button secondary" type="button" onClick={() => setJsonData(JSON.stringify(customProfiles, null, 2))}>{labels.exportJson}</button>
                  <button className="button secondary" type="button" onClick={importJson}>{labels.importJson}</button>
                </div>
                <div className="field-control">
                  <InfoLabel label={labels.jsonData} body={help("helpJsonData", labels.localStorageNote)} onOpen={setInfoModal} />
                  <textarea value={jsonData} onChange={(event) => setJsonData(event.target.value)} />
                </div>
                <p className="small">{labels.localStorageNote}</p>
              </section>
          </aside>

          {result ? (
          <section className="stack kerf-results-rail">
            {result.blocked ? <div className="error">{labels.unknownPlasticBlocked}</div> : null}
            <div className="readouts">
              <MetricCard label={labels.focusDepth} value={`${formatNumber(result.recommendedFocusDepthMm, 3)} mm`} sub={`${formatNumber(result.recommendedFocusPercent, 1)}% · ${labels[result.placementLabelKey]}`} detail={labels.focusDepthExplain} onInfoOpen={setInfoModal} tone={result.blocked ? "danger" : "ok"} />
              <MetricCard label={labels.focusRange} value={`${formatNumber(result.acceptableFocusMinMm, 2)} - ${formatNumber(result.acceptableFocusMaxMm, 2)} mm`} sub={`${formatNumber(result.acceptableFocusMinPercent, 1)}% - ${formatNumber(result.acceptableFocusMaxPercent, 1)}%`} />
              <MetricCard label={labels.opticalTaper} value={labels[result.opticalTaperTendency]} sub={`${labels.symmetryError}: ${formatNumber(result.opticalSymmetryError * 100, 1)}%`} detail={labels.opticalTaperExplain} onInfoOpen={setInfoModal} tone={result.opticalTaperTendency === "high" ? "warn filled" : "ok"} />
              <MetricCard label={labels.confidence} value={`${labels[result.confidence]} ${formatNumber(result.confidenceScore, 0)}/100`} sub={confidenceExplanation} detail={labels.confidenceExplainBody} onInfoOpen={setInfoModal} />
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
          ) : (
            <section className="stack kerf-results-empty kerf-results-rail" aria-live="polite">
              <RequiredFieldsPanel items={requiredFields} labels={labels} onJump={jumpToRequiredField} />
            </section>
          )}
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

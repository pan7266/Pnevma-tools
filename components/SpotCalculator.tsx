"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { GraphModal } from "@/components/GraphModal";
import { BeamLibraryGraph, BeamPreview, ExpanderGraph, FinishGraph, FocalGraph, LensShapePreview, MirrorFinishPreview, OpticalPathGraph, PowerPathGraph, PulseHzGraph } from "@/components/SpotGraphs";
import { SpotIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { calculateSpotFromApi } from "@/lib/api/spot-client";
import { spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { FOCAL_LENGTHS, LENS_DIAMETERS, LENS_SHAPES } from "@/lib/data/lenses";
import { MIRROR_DIAMETERS } from "@/lib/data/mirrors";
import { EXPANDER_MULTIPLIERS } from "@/lib/data/options";
import { SOURCE_LIBRARY } from "@/lib/data/sources";
import { getFilteredSources, getSource } from "@/lib/calculators/spot";
import { validateSpotInputs } from "@/lib/validation/spot-validation";
import {
  displayTemperatureValue,
  displayLengthValue,
  formatCompact,
  formatLength,
  formatNumber,
  formatOptionLength,
  lengthUnit,
  parseTemperatureValue,
  parseLengthValue,
  temperatureUnit,
} from "@/lib/units/convert";
import { getLocale } from "@/locales";
import type { SourcePreset, SpotInputs, SpotResult } from "@/types";

type ModalState = { title: string; body?: string; content?: ReactNode } | null;
type GraphModalState = "path" | "beam" | "finish" | "focal" | "source" | "pulse" | "expander" | "optical" | null;
const SPOT_STORAGE_KEY = "pnevma.spot.values.v3";
const OPTICAL_PROFILE_STORAGE_KEY = "pnevma.opticalProfiles.v1";
const SPOT_FIELD_NAMES: Array<keyof SpotInputs> = [
  "sourceId",
  "manualRatedWatt",
  "manualSourceBeamMm",
  "manualM2",
  "measuredWatt",
  "peakWatt",
  "powerPercent",
  "ampValue",
  "hz",
  "lensDiameter",
  "focalLength",
  "mirrorDiameter",
  "mirrorTempC",
  "alignmentLossPercent",
  "expanderMultiplier",
  "beamCombinerTransmission",
  "beamCombinerDiameter",
];

function inputPlaceholder(example: string) {
  return example;
}

function labelWithUnit(label: string, unit: string) {
  const cleaned = label
    .replace(/\s*\((mm|in|C|F)\)/gi, "")
    .replace(/\s+(mm|in|C|F)$/gi, "");
  return `${cleaned} (${unit})`;
}

function invalidFieldsFromErrors(errors: string[]): string[] {
  return SPOT_FIELD_NAMES.filter((field) => errors.some((error) => error.includes(field)));
}

function saveOpticalProfile(result: SpotResult) {
  const now = new Date().toISOString();
  const waistRadiusMm = result.spot / 2;
  const wavelengthMm = result.source.wavelengthUm / 1000;
  const rayleighRangeMm = Math.PI * waistRadiusMm * waistRadiusMm / (Math.max(result.source.m2, 0.01) * wavelengthMm);
  const profile = {
    id: "spot-current",
    profileName: `${result.source.brand} ${result.source.model} / ${formatNumber(result.focalLength, 1)} mm / ${formatNumber(result.spot * 1000, 1)} um`,
    wavelengthUm: result.source.wavelengthUm,
    lensFocalLengthMm: result.focalLength,
    measuredSpotDiameterUm: result.spot * 1000,
    measuredSpotDiameterMm: result.spot,
    waistRadiusMm,
    rayleighRangeMm,
    depthOfFocusMm: 2 * rayleighRangeMm,
    confocalParameterMm: 2 * rayleighRangeMm,
    m2: result.source.m2,
    tubePowerW: result.exactOrRatedWatt,
    tubeCurrentMa: result.expectedCurrentMa || undefined,
    measuredOutputPowerW: result.deliveredWatt,
    updatedAt: now,
  };
  try {
    const stored = window.localStorage.getItem(OPTICAL_PROFILE_STORAGE_KEY);
    const profiles = stored ? JSON.parse(stored) as Array<{ id?: string }> : [];
    const next = Array.isArray(profiles)
      ? [profile, ...profiles.filter((item: { id?: string }) => item?.id !== profile.id)]
      : [profile];
    window.localStorage.setItem(OPTICAL_PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(OPTICAL_PROFILE_STORAGE_KEY, JSON.stringify([profile]));
  }
}

function FieldLabel({
  children,
  infoKey,
  labels,
  info,
  onOpen,
}: {
  children: ReactNode;
  infoKey: string;
  labels: Record<string, string>;
  info: Record<string, string>;
  onOpen: (modal: { title: string; body: string }) => void;
}) {
  return (
    <span className="label-line">
      {children}
      {info[infoKey] ? <InfoButton title={String(children)} body={info[infoKey]} onOpen={onOpen} /> : null}
      <span className="sr-only">{labels.why}</span>
    </span>
  );
}

export function SpotCalculator() {
  const { lang, unitSystem } = useAppSettings();
  const labels = useMemo(() => getLocale(lang).spot, [lang]);
  const info = useMemo(() => getLocale(lang).spotInfo, [lang]);
  const [values, setValues] = useState<SpotInputs>(spotDefaultValues as unknown as SpotInputs);
  const [storageReady, setStorageReady] = useState(false);
  const [sourceQuery, setSourceQuery] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [result, setResult] = useState<SpotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [graphModal, setGraphModal] = useState<GraphModalState>(null);
  const filteredSources = useMemo(() => getFilteredSources(values.family), [values.family]);
  const displayLengthUnit = lengthUnit(unitSystem);
  const displayTemperatureUnit = temperatureUnit(unitSystem);
  const powerDensityUnit = unitSystem === "imperial" ? "W/in²" : "W/mm²";
  const sourceOptionLabel = useCallback(
    (source: SourcePreset) => `${source.brand} ${source.model} / ${source.ratedWatt} W / ${formatLength(source.beamMm, unitSystem, 2)}`,
    [unitSystem],
  );
  const matchedSourceId = useMemo(() => {
    if (values.sourceId) return values.sourceId;
    const normalized = sourceQuery.trim().toLowerCase();
    if (!normalized) return "";
    return filteredSources.find((source) => {
      const label = sourceOptionLabel(source).toLowerCase();
      return label === normalized || label.includes(normalized) || `${source.brand} ${source.model}`.toLowerCase() === normalized;
    })?.id || "";
  }, [filteredSources, sourceOptionLabel, sourceQuery, values.sourceId]);
  const estimatedSelectedWatt = useMemo(() => {
    const sourceRated = matchedSourceId ? getSource(matchedSourceId).ratedWatt : 0;
    const base = Number(values.measuredWatt || values.manualRatedWatt || sourceRated || 0);
    const percent = Number(values.powerPercent || 0);
    return Number.isFinite(base) && Number.isFinite(percent) ? base * (percent / 100) : 0;
  }, [matchedSourceId, values.manualRatedWatt, values.measuredWatt, values.powerPercent]);
  const previewCombinerTransmission = values.beamCombinerPosition === "none"
    ? 1
    : Math.min(Math.max(Number(values.beamCombinerTransmission || 100) / 100, 0), 1);
  const previewPulseEnergy = (estimatedSelectedWatt * previewCombinerTransmission / Math.max(Number(values.hz) || 1, 1)) * 1000;
  const fieldInvalid = useCallback((field: keyof SpotInputs) => invalidFields.includes(field) ? "invalid-field" : undefined, [invalidFields]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SPOT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SpotInputs>;
        setValues((current) => ({ ...current, ...parsed }));
      }
    } catch {
      window.localStorage.removeItem(SPOT_STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(SPOT_STORAGE_KEY, JSON.stringify(values));
  }, [storageReady, values]);

  useEffect(() => {
    if (!values.sourceId) return;
    const source = getSource(values.sourceId);
    setSourceQuery(sourceOptionLabel(source));
  }, [sourceOptionLabel, values.sourceId]);

  const runCalculation = useCallback(async () => {
    try {
      setError(null);
      const calculationValues = matchedSourceId && matchedSourceId !== values.sourceId ? { ...values, sourceId: matchedSourceId } : values;
      const validation = validateSpotInputs(calculationValues);
      if (!validation.ok || !validation.value) {
        setInvalidFields(invalidFieldsFromErrors(validation.errors));
        setError(labels.invalidInputs);
        return;
      }
      if (matchedSourceId && matchedSourceId !== values.sourceId) {
        setValues(calculationValues);
      }
      const next = await calculateSpotFromApi(validation.value);
      setResult(next);
      setHasRun(true);
      setInvalidFields([]);
      saveOpticalProfile(next);
    } catch (err) {
      setError(labels.invalidInputs);
    }
  }, [labels.invalidInputs, matchedSourceId, values]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      void runCalculation();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [storageReady, runCalculation]);

  function updateField(name: keyof SpotInputs, value: SpotInputs[keyof SpotInputs]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateLensFinish(finish: string) {
    setValues((current) => ({
      ...current,
      finish,
      cvdMaker: finish === "CVD" ? current.cvdMaker : "generic",
    }));
  }

  function updateFamily(family: string) {
    setValues((current) => {
      const nextSources = getFilteredSources(family);
      const sourceStillVisible = nextSources.some((source) => source.id === current.sourceId);
      return {
        ...current,
        family,
        sourceId: sourceStillVisible ? current.sourceId : "",
      };
    });
    if (!getFilteredSources(family).some((source) => sourceOptionLabel(source) === sourceQuery)) {
      setSourceQuery("");
    }
  }

  function updateSource(sourceId: string) {
    setValues((current) => ({
      ...current,
      sourceId,
    }));
  }

  function updateSourceQuery(text: string) {
    setSourceQuery(text);
    const normalized = text.trim().toLowerCase();
    const match = filteredSources.find((source) => {
      const label = sourceOptionLabel(source).toLowerCase();
      return label === normalized || label.includes(normalized) || `${source.brand} ${source.model}`.toLowerCase() === normalized || source.id.toLowerCase() === normalized;
    });
    updateSource(match?.id || "");
  }

  function openLampDetails() {
    const activeSourceId = matchedSourceId || values.sourceId;
    if (!activeSourceId && !result?.source) {
      setModal({ title: labels.lampDetails, body: labels.manualSourceHint });
      return;
    }
    const source = result?.source || getSource(activeSourceId);
    const rows = [
      [labels.brand, source.brand],
      [labels.model, source.model],
      [labels.excitation, source.excitation],
      [labels.rated, `${source.ratedWatt} W`],
      [labels.peak, source.peakWatt ? `${source.peakWatt} W` : labels.notAvailable || "N/A"],
      [labels.sourceBeam, `${formatLength(source.beamMm, unitSystem, 2)} (${source.tolerance})`],
      ["M2", String(source.m2)],
      [labels.defaultHz, `${formatCompact(source.hzDefault, 0)} Hz`],
      [labels.maxHz, `${formatCompact(source.hzMax, 0)} Hz`],
      [labels.wavelength, `${source.wavelengthUm} um`],
      [labels.confidence, source.confidence],
      [labels.tubeLength, source.tubeLengthMm ? formatLength(source.tubeLengthMm, unitSystem, 1) : labels.notAvailable || "N/A"],
      [labels.tubeDiameter, source.tubeDiameterMm ? formatLength(source.tubeDiameterMm, unitSystem, 1) : labels.notAvailable || "N/A"],
      [labels.bestCurrent, source.currentBestMa ? `${source.currentBestMa} mA` : labels.notAvailable || "N/A"],
      [labels.dataSource, source.sourceLabel],
    ];
    setModal({
      title: labels.lampDetails,
      content: (
        <div className="lamp-details">
          {rows.map(([label, value]) => (
            <div className="kv" key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          {source.sourceUrl ? (
            <a className="button source-link-button" href={source.sourceUrl} target="_blank" rel="noreferrer">
              {labels.openSourceLink}
            </a>
          ) : null}
        </div>
      ),
    });
  }

  const uniqueSourceLinks = SOURCE_LIBRARY.filter((source) => source.sourceUrl);

  function graphModalContent() {
    if (graphModal === "pulse") {
      return <PulseHzGraph hz={Number(values.hz) || 1} selectedWatt={result?.selectedWatt || estimatedSelectedWatt} pulseEnergyMj={result?.pulseEnergyMj || previewPulseEnergy} labels={labels} expanded onHzChange={(hz) => updateField("hz", hz)} />;
    }
    if (!result) return null;
    if (graphModal === "path") return <PowerPathGraph result={result} labels={labels} expanded />;
    if (graphModal === "beam") return <BeamPreview result={result} labels={labels} unitSystem={unitSystem} expanded onFocalLengthChange={(value) => updateField("focalLength", value)} />;
    if (graphModal === "finish") return <FinishGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />;
    if (graphModal === "focal") return <FocalGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} expanded />;
    if (graphModal === "source") return <BeamLibraryGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />;
    if (graphModal === "expander") return <ExpanderGraph result={result} labels={labels} unitSystem={unitSystem} />;
    if (graphModal === "optical") return <OpticalPathGraph result={result} labels={labels} unitSystem={unitSystem} expanded />;
    return null;
  }

  function graphModalTitle() {
    const titles = {
      path: labels.pathGraphTitle,
      beam: labels.beamPathTitle,
      finish: labels.graphFinishTitle,
      focal: labels.graphFocalTitle,
      source: labels.graphSourceTitle,
      pulse: labels.pulseGraphTitle,
      expander: labels.expanderGraphTitle,
      optical: labels.fullOpticalPathTitle,
    };
    return graphModal ? titles[graphModal] : labels.expandGraph;
  }

  return (
    <main className="app spot-tool">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <SpotIcon />
          </div>
          <div>
            <h1>{labels.title}</h1>
            <p className="subhead">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="panel panel-pad toolbar spot-source-toolbar" aria-label={labels.spotHeaderTitle}>
        <div className="spot-header-grid">
          <div className="spot-source-row">
            <div className="mode-field">
              <span className="label-line">
                {labels.family}
                <InfoButton title={labels.family} body={info.family} onOpen={setModal} />
              </span>
              <select value={values.family} onChange={(event) => updateFamily(event.target.value)}>
                <option value="all">{labels.all}</option>
                <option value="DC">{labels.dc}</option>
                <option value="RF">{labels.rf}</option>
              </select>
            </div>
            <label className="source-autocomplete source-preset-field">
              <span className="label-line">
                {labels.sourcePreset}
                <InfoButton title={labels.sourcePreset} body={info.sourcePreset} onOpen={setModal} />
              </span>
              <div className="source-with-action">
                <input
                  list="co2-source-presets"
                  value={sourceQuery}
                  placeholder={labels.sourcePresetPlaceholder}
                  onChange={(event) => updateSourceQuery(event.target.value)}
                />
                <button className="button secondary" type="button" onClick={openLampDetails}>{labels.lampDetails}</button>
              </div>
              <datalist id="co2-source-presets">
                {filteredSources.map((source) => (
                  <option key={source.id} value={sourceOptionLabel(source)} />
                ))}
              </datalist>
            </label>
            {!matchedSourceId ? (
              <>
                <label className={fieldInvalid("manualRatedWatt")}>
                  <FieldLabel infoKey="manualRatedWatt" labels={labels} info={info} onOpen={setModal}>
                    {labels.manualRatedWatt}
                  </FieldLabel>
                  <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("100 W")} value={String(values.manualRatedWatt ?? "")} onChange={(event) => updateField("manualRatedWatt", event.target.value)} />
                </label>
                <label className={fieldInvalid("manualSourceBeamMm")}>
                  <FieldLabel infoKey="manualSourceBeam" labels={labels} info={info} onOpen={setModal}>
                    {labelWithUnit(labels.manualSourceBeam, displayLengthUnit)}
                  </FieldLabel>
                  <input type="number" min="0" step="0.01" placeholder={inputPlaceholder(unitSystem === "imperial" ? "0.315 in" : "8 mm")} value={displayLengthValue(values.manualSourceBeamMm, unitSystem, 4)} onChange={(event) => updateField("manualSourceBeamMm", parseLengthValue(event.target.value, unitSystem))} />
                </label>
                <label className={fieldInvalid("manualM2")}>
                  <FieldLabel infoKey="manualM2" labels={labels} info={info} onOpen={setModal}>{labels.manualM2}</FieldLabel>
                  <input type="number" min="0" step="0.01" placeholder={inputPlaceholder("1.2")} value={String(values.manualM2 ?? "")} onChange={(event) => updateField("manualM2", event.target.value)} />
                </label>
              </>
            ) : null}
          </div>
          <div className="spot-measurement-row">
            <label className={fieldInvalid("measuredWatt")}>
              <FieldLabel infoKey="measuredWatt" labels={labels} info={info} onOpen={setModal}>{labels.measuredWatt}</FieldLabel>
              <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("130 W")} value={String(values.measuredWatt ?? "")} onChange={(event) => updateField("measuredWatt", event.target.value)} />
            </label>
            <label className={fieldInvalid("peakWatt")}>
              <FieldLabel infoKey="peakWatt" labels={labels} info={info} onOpen={setModal}>{labels.peakWatt}</FieldLabel>
              <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("150 W")} value={String(values.peakWatt ?? "")} onChange={(event) => updateField("peakWatt", event.target.value)} />
            </label>
          </div>
        </div>
      </section>

      <section className="layout">
        <aside className="panel panel-pad stack">
          {error ? <div className="error">{error}</div> : null}

          <CollapsibleSection title={labels.lampCalibration}>
            <div className="spot-left-measurement stack">
              <label className={`power-header-field ${fieldInvalid("powerPercent") || ""}`}>
                <FieldLabel infoKey="powerPercent" labels={labels} info={info} onOpen={setModal}>{labels.powerPercent}</FieldLabel>
                <div className="power-slider-card">
                  <div className="power-slider-top">
                    <span>{labels.selectedPower}</span>
                    <strong>{values.powerPercent}{labels.percentUnit}</strong>
                  </div>
                  <div className="range-wrap premium-range">
                    <input type="range" min="0" max="100" step="1" value={Number(values.powerPercent)} onChange={(event) => updateField("powerPercent", Number(event.target.value))} />
                    <input type="number" min="0" max="100" step="1" placeholder={inputPlaceholder("65%")} value={String(values.powerPercent)} onChange={(event) => updateField("powerPercent", event.target.value)} />
                  </div>
                  <div className="power-slider-scale">
                    <span>{labels.minPower} 0%</span>
                    <span>{labels.warningZone} 90-100%</span>
                    <span>{labels.maxPower} 100%</span>
                  </div>
                </div>
              </label>
              <div className="field-row compact-row">
                <label className={fieldInvalid("ampValue")}>
                  <FieldLabel infoKey="ampValue" labels={labels} info={info} onOpen={setModal}>{labels.ampValue}</FieldLabel>
                  <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("30 mA")} value={String(values.ampValue ?? "")} onChange={(event) => updateField("ampValue", event.target.value)} />
                </label>
                <label>
                  <FieldLabel infoKey="ampMeterType" labels={labels} info={info} onOpen={setModal}>{labels.ampMeterType}</FieldLabel>
                  <select value={values.ampMeterType} onChange={(event) => updateField("ampMeterType", event.target.value)}>
                    <option value="digital">{labels.digital}</option>
                    <option value="analog">{labels.analog}</option>
                  </select>
                </label>
              </div>
              <div className={`pulse-stack ${fieldInvalid("hz") || ""}`}>
                <label className={fieldInvalid("hz")}>
                  <FieldLabel infoKey="pulseHz" labels={labels} info={info} onOpen={setModal}>{labels.pulseHz}</FieldLabel>
                  <input type="number" min="1" step="100" placeholder={inputPlaceholder("20000 Hz")} value={String(values.hz)} onChange={(event) => updateField("hz", event.target.value)} />
                </label>
                <PulseHzGraph
                  hz={Number(values.hz) || 1}
                  selectedWatt={result?.selectedWatt || estimatedSelectedWatt}
                  pulseEnergyMj={result?.pulseEnergyMj || previewPulseEnergy}
                  labels={labels}
                  onHzChange={(hz) => updateField("hz", hz)}
                  onExpand={() => setGraphModal("pulse")}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.lens}>
            <div className="field-row compact-row">
              <label className={fieldInvalid("lensDiameter")}>
                <FieldLabel infoKey="lensDiameter" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.lensDiameter, displayLengthUnit)}</FieldLabel>
                <select value={String(values.lensDiameter)} onChange={(event) => updateField("lensDiameter", Number(event.target.value))}>
                  {LENS_DIAMETERS.map((option) => (
                    <option key={option.mm} value={option.mm}>{formatOptionLength(option.mm, unitSystem)}</option>
                  ))}
                </select>
              </label>
              <label className={fieldInvalid("focalLength")}>
                <FieldLabel infoKey="focalLength" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.focalLength, displayLengthUnit)}</FieldLabel>
                <select value={String(values.focalLength)} onChange={(event) => updateField("focalLength", Number(event.target.value))}>
                  {FOCAL_LENGTHS.map((option) => (
                    <option key={option.mm} value={option.mm}>{formatOptionLength(option.mm, unitSystem)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="optic-split">
              <div className="optic-column">
                <label>
                  <FieldLabel infoKey="lensShape" labels={labels} info={info} onOpen={setModal}>{labels.lensShape}</FieldLabel>
                  <select value={values.lensShape} onChange={(event) => updateField("lensShape", event.target.value)}>
                    {Object.entries(LENS_SHAPES).map(([key, shape]) => (
                      <option key={key} value={key}>{labels[shape.labelKey]}</option>
                    ))}
                  </select>
                </label>
                <LensShapePreview shape={values.lensShape} labels={labels} />
              </div>
              <div className="optic-column">
                <label>
                  <FieldLabel infoKey="lensFinish" labels={labels} info={info} onOpen={setModal}>{labels.lensFinish}</FieldLabel>
                  <select value={values.finish} onChange={(event) => updateLensFinish(event.target.value)}>
                    {Object.keys(FINISHES).map((finish) => <option key={finish} value={finish}>{finish}</option>)}
                  </select>
                </label>
                {values.finish === "CVD" ? (
                  <label className="check-label lens-finish-check">
                    <input type="checkbox" checked={values.cvdMaker === "iivi"} onChange={(event) => updateField("cvdMaker", event.target.checked ? "iivi" : "generic")} />
                    <FieldLabel infoKey="cvdMaker" labels={labels} info={info} onOpen={setModal}>{labels.iiViCvd}</FieldLabel>
                  </label>
                ) : null}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.mirrorSetup}>
            <div className="optic-split">
              <div className="optic-column">
                <label>
                  <FieldLabel infoKey="mirrorFinish" labels={labels} info={info} onOpen={setModal}>{labels.mirrorFinish}</FieldLabel>
                  <select value={values.mirrorFinish} onChange={(event) => updateField("mirrorFinish", event.target.value)}>
                    {Object.entries(MIRROR_FINISHES).map(([key, mirror]) => (
                      <option key={key} value={key}>{mirror.label} ({formatCompact(mirror.reflectivity * 100, 1)}%)</option>
                    ))}
                  </select>
                </label>
                <MirrorFinishPreview
                  finishKey={values.mirrorFinish}
                  label={MIRROR_FINISHES[values.mirrorFinish as keyof typeof MIRROR_FINISHES]?.label || labels.mirrorFinish}
                  reflectivity={MIRROR_FINISHES[values.mirrorFinish as keyof typeof MIRROR_FINISHES]?.reflectivity || 0}
                  diameterMm={Number(values.mirrorDiameter) || 0}
                  unitSystem={unitSystem}
                  labels={labels}
                />
              </div>
              <div className="optic-column">
                <label className={fieldInvalid("mirrorDiameter")}>
                  <FieldLabel infoKey="mirrorDiameter" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.mirrorDiameter, displayLengthUnit)}</FieldLabel>
                  <select value={String(values.mirrorDiameter)} onChange={(event) => updateField("mirrorDiameter", Number(event.target.value))}>
                    {MIRROR_DIAMETERS.map((mm) => <option key={mm} value={mm}>{formatOptionLength(mm, unitSystem)}</option>)}
                  </select>
                </label>
                <label className={fieldInvalid("mirrorTempC")}>
                  <FieldLabel infoKey="mirrorTempC" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.mirrorTempC, displayTemperatureUnit)}</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={inputPlaceholder(unitSystem === "imperial" ? "95 F" : "35 C")}
                    value={displayTemperatureValue(values.mirrorTempC, unitSystem)}
                    onChange={(event) => updateField("mirrorTempC", parseTemperatureValue(event.target.value, unitSystem))}
                  />
                </label>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.atmosphereUse}>
            <label className="check-label">
              <input type="checkbox" checked={values.smokePresent} onChange={(event) => updateField("smokePresent", event.target.checked)} />
              <FieldLabel infoKey="smokePresent" labels={labels} info={info} onOpen={setModal}>{labels.smokePresent}</FieldLabel>
            </label>
            <div className="field-row extractor-row">
              <label className="check-label">
                <input type="checkbox" checked={values.extractorOn} onChange={(event) => updateField("extractorOn", event.target.checked)} />
                <FieldLabel infoKey="extractorOn" labels={labels} info={info} onOpen={setModal}>{labels.extractorOn}</FieldLabel>
              </label>
              <label className="compact-select-only">
                <span className="sr-only">{labels.extractorStrength}</span>
                <select value={values.extractorStrength} onChange={(event) => updateField("extractorStrength", event.target.value)}>
                  <option value="weak">{labels.weak}</option>
                  <option value="normal">{labels.normal}</option>
                  <option value="strong">{labels.strong}</option>
                </select>
              </label>
            </div>
            <div className="alignment-inline-row">
              <label className="check-label">
                <input type="checkbox" checked={values.imperfectAlignment} onChange={(event) => updateField("imperfectAlignment", event.target.checked)} />
                <FieldLabel infoKey="imperfectAlignment" labels={labels} info={info} onOpen={setModal}>{labels.imperfectAlignment}</FieldLabel>
              </label>
              <label className={fieldInvalid("alignmentLossPercent")}>
                <FieldLabel infoKey="alignmentLossPercent" labels={labels} info={info} onOpen={setModal}>{labels.alignmentLossPercent}</FieldLabel>
                <select value={String(values.alignmentLossPercent)} onChange={(event) => updateField("alignmentLossPercent", event.target.value)}>
                  {Array.from({ length: 19 }, (_, percent) => (
                    <option key={percent} value={percent}>
                      {percent}% {[3, 4, 5].includes(percent) ? labels.commonLoss : ""}
                    </option>
                  ))}
                </select>
                {result ? <span className="field-hint">{labels.alignmentImpact}: {formatCompact(result.alignmentLostWatt, 2)} W</span> : null}
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.advanced} open={false}>
            <label className="check-label">
              <input type="checkbox" checked={values.useExpander} onChange={(event) => updateField("useExpander", event.target.checked)} />
              <FieldLabel infoKey="useExpander" labels={labels} info={info} onOpen={setModal}>{labels.useExpander}</FieldLabel>
            </label>
            <div className="field-row preview-row">
              <label className={fieldInvalid("expanderMultiplier")}>
                <FieldLabel infoKey="expanderMultiplier" labels={labels} info={info} onOpen={setModal}>{labels.expanderMultiplier}</FieldLabel>
                <select value={String(values.expanderMultiplier)} onChange={(event) => updateField("expanderMultiplier", Number(event.target.value))} disabled={!values.useExpander}>
                  {EXPANDER_MULTIPLIERS.map((multiplier) => <option key={multiplier} value={multiplier}>{multiplier}x</option>)}
                </select>
              </label>
              {result ? <ExpanderGraph result={result} labels={labels} unitSystem={unitSystem} onExpand={setGraphModal} /> : null}
            </div>
            <label>
              <FieldLabel infoKey="beamCombinerPosition" labels={labels} info={info} onOpen={setModal}>{labels.beamCombinerPosition}</FieldLabel>
              <select value={values.beamCombinerPosition} onChange={(event) => updateField("beamCombinerPosition", event.target.value)}>
                <option value="none">{labels.noCombiner}</option>
                <option value="nearSource">{labels.combinerNearSource}</option>
                <option value="beforeFirstMirror">{labels.combinerBeforeFirstMirror}</option>
                <option value="firstMirror">{labels.combinerAtFirstMirror}</option>
              </select>
            </label>
            <div className="field-row compact-row">
              <label className={fieldInvalid("beamCombinerTransmission")}>
                <FieldLabel infoKey="beamCombinerTransmission" labels={labels} info={info} onOpen={setModal}>{labels.combinerTransmission}</FieldLabel>
                <input type="number" min="0" max="100" step="0.1" placeholder={inputPlaceholder("97%")} value={String(values.beamCombinerTransmission)} onChange={(event) => updateField("beamCombinerTransmission", event.target.value)} disabled={values.beamCombinerPosition === "none"} />
              </label>
              <label className={fieldInvalid("beamCombinerDiameter")}>
                <FieldLabel infoKey="beamCombinerDiameter" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.combinerDiameter, displayLengthUnit)}</FieldLabel>
                <input type="number" min="0" step="0.1" placeholder={inputPlaceholder(unitSystem === "imperial" ? "0.79 in" : "20 mm")} value={displayLengthValue(values.beamCombinerDiameter, unitSystem, 3)} onChange={(event) => updateField("beamCombinerDiameter", parseLengthValue(event.target.value, unitSystem))} disabled={values.beamCombinerPosition === "none"} />
              </label>
            </div>
          </CollapsibleSection>

        </aside>

        <section className="stack">
          {!hasRun || !result ? (
            <div className="panel panel-pad empty-state">
              <h2>{labels.readyTitle}</h2>
              <p>{labels.readyBody}</p>
              <p className="data-note">{labels.dataNotice}</p>
            </div>
          ) : (
            <>
              <div className="panel visual-panel">
                <PowerPathGraph result={result} labels={labels} onExpand={setGraphModal} />
                <BeamPreview result={result} labels={labels} unitSystem={unitSystem} onExpand={setGraphModal} onFocalLengthChange={(value) => updateField("focalLength", value)} />
                <OpticalPathGraph result={result} labels={labels} unitSystem={unitSystem} onExpand={setGraphModal} />
              </div>
              <div className="readouts">
                <MetricCard label={labels.spotDiameter} value={formatLength(result.spot, unitSystem, 4)} />
                <MetricCard label={labels.sourceBeam} value={formatLength(result.sourceBeam, unitSystem, 2)} />
                <MetricCard label={labels.effectiveBeam} value={formatLength(result.effectiveBeam, unitSystem, 2)} sub={`${formatLength(result.clearAperture, unitSystem, 2)} ${labels.lensLower} / ${formatLength(result.mirrorClearAperture, unitSystem, 2)} ${labels.mirrorLower}`} />
                <MetricCard label={labels.expandedBeam} value={formatLength(result.expandedBeam, unitSystem, 2)} />
                <MetricCard label={labels.selectedWatt} value={`${formatCompact(result.selectedWatt, 2)} W`} sub={labels[result.wattBasis]} />
                <MetricCard label={labels.deliveredWatt} value={`${formatCompact(result.deliveredWatt, 2)} W`} />
                <MetricCard label={labels.mirrorLoss} value={`${formatCompact(result.mirrorAbsorbedWatt, 2)} W`} />
                <MetricCard label={labels.pathLoss} value={`${formatCompact(result.pathTransmission * 100, 1)}%`} />
                <MetricCard label={labels.combinerEffect} value={`${formatCompact(result.beamCombinerLossWatt, 2)} W`} sub={`${formatCompact(result.beamCombinerTransmission * 100, 2)}%`} />
                <MetricCard label={labels.powerDensity} value={`${formatCompact(unitSystem === "imperial" ? result.powerDensityWPerMm2 * 645.16 : result.powerDensityWPerMm2, 2)} ${powerDensityUnit}`} />
                <MetricCard label={labels.beamStability} value={labels[result.beamStability]} tone={result.beamStability === "stable" ? "ok" : result.beamStability === "unstable" ? "danger" : "warn"} />
                <MetricCard label={labels.pulseEnergy} value={`${formatNumber(result.pulseEnergyMj, 3)} mJ`} />
              </div>
              <div className="graphs">
                <details className="graph-collapsible clickable-graph" open onClick={(event) => {
                  if ((event.target as HTMLElement).closest("summary")) return;
                  setGraphModal("finish");
                }}>
                  <summary>
                    <span>{labels.graphFinishTitle}</span>
                  </summary>
                  <FinishGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />
                </details>
                <details className="graph-collapsible clickable-graph" open onClick={(event) => {
                  if ((event.target as HTMLElement).closest("summary")) return;
                  setGraphModal("focal");
                }}>
                  <summary>
                    <span>{labels.graphFocalTitle}</span>
                  </summary>
                  <FocalGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />
                </details>
                <details className="graph-collapsible clickable-graph" open onClick={(event) => {
                  if ((event.target as HTMLElement).closest("summary")) return;
                  setGraphModal("source");
                }}>
                  <summary>
                    <span>{labels.graphSourceTitle}</span>
                  </summary>
                  <BeamLibraryGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />
                </details>
              </div>
              <div className={result.clipped ? "warning" : "data-note"}>
                {result.clipped ? labels.clipped : labels.okAperture}: {formatLength(result.expandedBeam, unitSystem, 2)} {labels.beam} / {formatLength(result.clearAperture, unitSystem, 2)} {labels.lensLower} / {formatLength(result.mirrorClearAperture, unitSystem, 2)} {labels.mirrorLower} {labels.apertureSuffix}.
              </div>
              <div className="data-note">
                {labels.opticalBaseline}: {formatLength(result.opticalSpot, unitSystem, 4)} {labels.opticalBaselineSuffix}
              </div>
              <div className="data-note">
                {labels.why}: {labels[`${result.beamStability}Reason`] || labels[result.beamStability]}
              </div>
              <div className="info-box">
                <strong>{labels.assumptionsTitle}</strong>
                {result.assumptions.map((assumption) => <p key={assumption}>{labels[assumption] || assumption}</p>)}
              </div>
            </>
          )}
        </section>

        <aside className="panel panel-pad stack side-notes">
          <h2>{labels.sourceCoverage}</h2>
          <p>{labels.sourceCoverageBody}</p>
          <p className="data-note">{labels.dataNotice}</p>
          <details>
            <summary>{labels.sources}</summary>
            <ul className="source-links">
              {uniqueSourceLinks.slice(0, 18).map((source) => (
                <li key={source.id}>
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.brand} {source.model}</a>
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>{labels.formula}</summary>
            <p>{info.formula}</p>
          </details>
        </aside>
      </section>

      {modal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal.title}</h2>
              <button className="button secondary modal-close" type="button" onClick={() => setModal(null)} aria-label={labels.close}>x</button>
            </div>
            {modal.content ? modal.content : <p className="modal-body-text">{modal.body}</p>}
          </div>
        </div>
      ) : null}

      {graphModal ? (
        <GraphModal title={graphModalTitle()} closeLabel={labels.close} onClose={() => setGraphModal(null)}>
          {graphModalContent()}
        </GraphModal>
      ) : null}
    </main>
  );
}

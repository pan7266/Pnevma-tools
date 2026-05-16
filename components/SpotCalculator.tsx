"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { GraphModal } from "@/components/GraphModal";
import { BeamLibraryGraph, BeamPreview, FinishGraph, FocalGraph, PowerPathGraph } from "@/components/SpotGraphs";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { calculateSpotFromApi } from "@/lib/api/spot-client";
import { spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { SPOT_INFO, SPOT_TEXT } from "@/lib/data/i18n";
import { FOCAL_LENGTHS, LENS_DIAMETERS, LENS_SHAPES } from "@/lib/data/lenses";
import { MIRROR_DIAMETERS } from "@/lib/data/mirrors";
import { EXPANDER_MULTIPLIERS } from "@/lib/data/options";
import { SOURCE_LIBRARY } from "@/lib/data/sources";
import { getFilteredSources, getSource } from "@/lib/calculators/spot";
import {
  displayTemperatureValue,
  formatCompact,
  formatLength,
  formatNumber,
  formatOptionLength,
  lengthUnit,
  parseTemperatureValue,
  temperatureUnit,
} from "@/lib/units/convert";
import type { Lang, SpotInputs, SpotResult } from "@/types";

type ModalState = { title: string; body?: string; content?: ReactNode } | null;
type GraphModalState = "path" | "beam" | "finish" | "focal" | "source" | null;

const SPOT_EXTRA_TEXT: Record<string, Record<string, string>> = {
  en: {
    brand: "Brand",
    model: "Model",
    excitation: "Excitation",
    defaultHz: "Default Hz",
    maxHz: "Max Hz",
    wavelength: "Wavelength",
    confidence: "Confidence",
    tubeLength: "Tube length",
    tubeDiameter: "Tube diameter",
    bestCurrent: "Best current",
    dataSource: "Data source",
    openSourceLink: "Open source link",
    lensLower: "lens",
    mirrorLower: "mirror",
    apertureSuffix: "aperture",
    opticalBaselineSuffix: "before finish, thermal, clipping, and alignment factors.",
  },
  el: {
    brand: "Μάρκα",
    model: "Μοντέλο",
    excitation: "Διέγερση",
    defaultHz: "Προεπιλεγμένα Hz",
    maxHz: "Μέγιστα Hz",
    wavelength: "Μήκος κύματος",
    confidence: "Βεβαιότητα",
    tubeLength: "Μήκος λυχνίας",
    tubeDiameter: "Διάμετρος λυχνίας",
    bestCurrent: "Βέλτιστο ρεύμα",
    dataSource: "Πηγή δεδομένων",
    openSourceLink: "Άνοιγμα συνδέσμου πηγής",
    lensLower: "φακός",
    mirrorLower: "καθρέφτης",
    apertureSuffix: "καθαρό άνοιγμα",
    opticalBaselineSuffix: "πριν τους παράγοντες φινιρίσματος, θερμότητας, clipping και ευθυγράμμισης.",
  },
};

function stripGreekAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getPack(pack: Readonly<Record<string, Readonly<Record<string, string>>>>, lang: Lang): Record<string, string> {
  const packs = pack as Readonly<Record<string, Readonly<Record<string, string>>>>;
  const source = { ...packs.en, ...(packs[lang] || {}) };
  const extra = { ...SPOT_EXTRA_TEXT.en, ...(SPOT_EXTRA_TEXT[lang] || {}) };
  const merged = { ...source, ...extra };
  if (lang !== "el") return merged;
  return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, stripGreekAccents(value)]));
}

function inputPlaceholder(example: string) {
  return `(${example})`;
}

function labelWithUnit(label: string, unit: string) {
  const cleaned = label
    .replace(/\s*\((mm|in|C|F)\)/gi, "")
    .replace(/\s+(mm|in|C|F)$/gi, "");
  return `${cleaned} (${unit})`;
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
  const labels = useMemo(() => getPack(SPOT_TEXT, lang), [lang]);
  const info = useMemo(() => getPack(SPOT_INFO, lang), [lang]);
  const [values, setValues] = useState<SpotInputs>(spotDefaultValues as unknown as SpotInputs);
  const [hasRun, setHasRun] = useState(false);
  const [result, setResult] = useState<SpotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [graphModal, setGraphModal] = useState<GraphModalState>(null);
  const filteredSources = useMemo(() => getFilteredSources(values.family), [values.family]);
  const displayLengthUnit = lengthUnit(unitSystem);
  const displayTemperatureUnit = temperatureUnit(unitSystem);

  const runCalculation = useCallback(async () => {
    try {
      setError(null);
      const next = await calculateSpotFromApi(values);
      setResult(next);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed.");
    }
  }, [values]);

  useEffect(() => {
    if (!hasRun) return;
    const timer = window.setTimeout(() => {
      void runCalculation();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hasRun, runCalculation]);

  function updateField(name: keyof SpotInputs, value: SpotInputs[keyof SpotInputs]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateFamily(family: string) {
    setValues((current) => {
      const nextSources = getFilteredSources(family);
      const sourceStillVisible = nextSources.some((source) => source.id === current.sourceId);
      const nextSource = sourceStillVisible ? getSource(current.sourceId) : nextSources[0];
      return {
        ...current,
        family,
        sourceId: nextSource.id,
      };
    });
  }

  function updateSource(sourceId: string) {
    setValues((current) => ({
      ...current,
      sourceId,
    }));
  }

  function reset() {
    setValues(spotDefaultValues as unknown as SpotInputs);
    setResult(null);
    setHasRun(false);
    setError(null);
  }

  function openLampDetails() {
    const source = result?.source || getSource(values.sourceId);
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
    if (!result) return null;
    if (graphModal === "path") return <PowerPathGraph result={result} labels={labels} expanded />;
    if (graphModal === "beam") return <BeamPreview result={result} labels={labels} unitSystem={unitSystem} expanded />;
    if (graphModal === "finish") return <FinishGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />;
    if (graphModal === "focal") return <FocalGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />;
    if (graphModal === "source") return <BeamLibraryGraph values={values} result={result} labels={labels} lang={lang} unitSystem={unitSystem} />;
    return null;
  }

  function graphModalTitle() {
    const titles = {
      path: labels.pathGraphTitle,
      beam: labels.beamPathTitle,
      finish: labels.graphFinishTitle,
      focal: labels.graphFocalTitle,
      source: labels.graphSourceTitle,
    };
    return graphModal ? titles[graphModal] : labels.expandGraph;
  }

  return (
    <main className="app spot-tool">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M10 43L32 10l22 43H10Z" fill="none" stroke="#f5b45b" strokeWidth="4" strokeLinejoin="round" />
              <path d="M21 40h22" stroke="#66a3ff" strokeWidth="5" strokeLinecap="round" />
              <circle cx="32" cy="32" r="4" fill="#ffffff" />
            </svg>
          </div>
          <div>
            <h1>{labels.title}</h1>
            <p className="subhead">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="layout">
        <aside className="panel panel-pad stack">
          <CollapsibleSection title={labels.source}>
            <label>
              <FieldLabel infoKey="family" labels={labels} info={info} onOpen={setModal}>{labels.family}</FieldLabel>
              <select value={values.family} onChange={(event) => updateFamily(event.target.value)}>
                <option value="all">{labels.all}</option>
                <option value="DC">{labels.dc}</option>
                <option value="RF">{labels.rf}</option>
              </select>
            </label>
            <div className="source-select-row">
              <label>
                <FieldLabel infoKey="sourcePreset" labels={labels} info={info} onOpen={setModal}>{labels.sourcePreset}</FieldLabel>
                <select value={values.sourceId} onChange={(event) => updateSource(event.target.value)}>
                  {filteredSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.brand} {source.model} / {source.ratedWatt} W / {formatLength(source.beamMm, unitSystem, 2)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="mini-button" type="button" onClick={openLampDetails}>
                {labels.lampDetails}
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.lampMeasurement}>
            <div className="field-row">
              <label>
                <FieldLabel infoKey="measuredWatt" labels={labels} info={info} onOpen={setModal}>{labels.measuredWatt}</FieldLabel>
                <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("130 W")} value={String(values.measuredWatt ?? "")} onChange={(event) => updateField("measuredWatt", event.target.value)} />
              </label>
              <label>
                <FieldLabel infoKey="peakWatt" labels={labels} info={info} onOpen={setModal}>{labels.peakWatt}</FieldLabel>
                <input type="number" min="0" step="0.1" placeholder={inputPlaceholder("150 W")} value={String(values.peakWatt ?? "")} onChange={(event) => updateField("peakWatt", event.target.value)} />
              </label>
            </div>
            <label>
              <FieldLabel infoKey="powerPercent" labels={labels} info={info} onOpen={setModal}>{labels.powerPercent}</FieldLabel>
              <div className="range-wrap">
                <input type="range" min="0" max="100" step="1" value={Number(values.powerPercent)} onChange={(event) => updateField("powerPercent", Number(event.target.value))} />
                <input type="number" min="0" max="100" step="1" placeholder={inputPlaceholder("65%")} value={String(values.powerPercent)} onChange={(event) => updateField("powerPercent", event.target.value)} />
              </div>
            </label>
            <div className="field-row">
              <label>
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
            <label>
              <FieldLabel infoKey="pulseHz" labels={labels} info={info} onOpen={setModal}>{labels.pulseHz}</FieldLabel>
              <input type="number" min="1" step="100" placeholder={inputPlaceholder("20000 Hz")} value={String(values.hz)} onChange={(event) => updateField("hz", event.target.value)} />
            </label>
          </CollapsibleSection>

          <CollapsibleSection title={labels.lens}>
            <div className="field-row">
              <label>
                <FieldLabel infoKey="lensDiameter" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.lensDiameter, displayLengthUnit)}</FieldLabel>
                <select value={String(values.lensDiameter)} onChange={(event) => updateField("lensDiameter", Number(event.target.value))}>
                  {LENS_DIAMETERS.map((option) => (
                    <option key={option.mm} value={option.mm}>{formatOptionLength(option.mm, unitSystem)}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel infoKey="focalLength" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.focalLength, displayLengthUnit)}</FieldLabel>
                <select value={String(values.focalLength)} onChange={(event) => updateField("focalLength", Number(event.target.value))}>
                  {FOCAL_LENGTHS.map((option) => (
                    <option key={option.mm} value={option.mm}>{formatOptionLength(option.mm, unitSystem)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                <FieldLabel infoKey="lensShape" labels={labels} info={info} onOpen={setModal}>{labels.lensShape}</FieldLabel>
                <select value={values.lensShape} onChange={(event) => updateField("lensShape", event.target.value)}>
                  {Object.entries(LENS_SHAPES).map(([key, shape]) => (
                    <option key={key} value={key}>{labels[shape.labelKey]}</option>
                  ))}
                </select>
              </label>
              <label>
                <FieldLabel infoKey="lensFinish" labels={labels} info={info} onOpen={setModal}>{labels.lensFinish}</FieldLabel>
                <select value={values.finish} onChange={(event) => updateField("finish", event.target.value)}>
                  {Object.keys(FINISHES).map((finish) => <option key={finish} value={finish}>{finish}</option>)}
                </select>
              </label>
            </div>
            {values.finish === "CVD" ? (
              <label className="check-label">
                <input type="checkbox" checked={values.cvdMaker === "iivi"} onChange={(event) => updateField("cvdMaker", event.target.checked ? "iivi" : "generic")} />
                <FieldLabel infoKey="cvdMaker" labels={labels} info={info} onOpen={setModal}>{labels.iiViCvd}</FieldLabel>
              </label>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection title={labels.mirrorSetup}>
            <label>
              <FieldLabel infoKey="mirrorFinish" labels={labels} info={info} onOpen={setModal}>{labels.mirrorFinish}</FieldLabel>
              <select value={values.mirrorFinish} onChange={(event) => updateField("mirrorFinish", event.target.value)}>
                {Object.entries(MIRROR_FINISHES).map(([key, mirror]) => (
                  <option key={key} value={key}>{mirror.label} ({formatCompact(mirror.reflectivity * 100, 1)}%)</option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel infoKey="mirrorDiameter" labels={labels} info={info} onOpen={setModal}>{labelWithUnit(labels.mirrorDiameter, displayLengthUnit)}</FieldLabel>
              <select value={String(values.mirrorDiameter)} onChange={(event) => updateField("mirrorDiameter", Number(event.target.value))}>
                {MIRROR_DIAMETERS.map((mm) => <option key={mm} value={mm}>{formatOptionLength(mm, unitSystem)}</option>)}
              </select>
            </label>
            <label>
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
          </CollapsibleSection>

          <CollapsibleSection title={labels.atmosphereUse}>
            <label className="check-label">
              <input type="checkbox" checked={values.smokePresent} onChange={(event) => updateField("smokePresent", event.target.checked)} />
              <FieldLabel infoKey="smokePresent" labels={labels} info={info} onOpen={setModal}>{labels.smokePresent}</FieldLabel>
            </label>
            <label className="check-label">
              <input type="checkbox" checked={values.extractorOn} onChange={(event) => updateField("extractorOn", event.target.checked)} />
              <FieldLabel infoKey="extractorOn" labels={labels} info={info} onOpen={setModal}>{labels.extractorOn}</FieldLabel>
            </label>
            <label>
              <FieldLabel infoKey="extractorStrength" labels={labels} info={info} onOpen={setModal}>{labels.extractorStrength}</FieldLabel>
              <select value={values.extractorStrength} onChange={(event) => updateField("extractorStrength", event.target.value)}>
                <option value="weak">{labels.weak}</option>
                <option value="normal">{labels.normal}</option>
                <option value="strong">{labels.strong}</option>
              </select>
            </label>
            <div className="alignment-inline-row">
              <label className="check-label">
                <input type="checkbox" checked={values.imperfectAlignment} onChange={(event) => updateField("imperfectAlignment", event.target.checked)} />
                <FieldLabel infoKey="imperfectAlignment" labels={labels} info={info} onOpen={setModal}>{labels.imperfectAlignment}</FieldLabel>
              </label>
              <label>
                <FieldLabel infoKey="alignmentLossPercent" labels={labels} info={info} onOpen={setModal}>{labels.alignmentLossPercent}</FieldLabel>
                <input type="number" min="0" max="18" step="0.1" placeholder={inputPlaceholder("4%")} value={String(values.alignmentLossPercent)} onChange={(event) => updateField("alignmentLossPercent", event.target.value)} />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={labels.advanced}>
            <label className="check-label">
              <input type="checkbox" checked={values.useExpander} onChange={(event) => updateField("useExpander", event.target.checked)} />
              <FieldLabel infoKey="useExpander" labels={labels} info={info} onOpen={setModal}>{labels.useExpander}</FieldLabel>
            </label>
            <label>
              <FieldLabel infoKey="expanderMultiplier" labels={labels} info={info} onOpen={setModal}>{labels.expanderMultiplier}</FieldLabel>
              <select value={String(values.expanderMultiplier)} onChange={(event) => updateField("expanderMultiplier", Number(event.target.value))} disabled={!values.useExpander}>
                {EXPANDER_MULTIPLIERS.map((multiplier) => <option key={multiplier} value={multiplier}>{multiplier}x</option>)}
              </select>
            </label>
          </CollapsibleSection>

          <div className="button-row">
            <button className="button" type="button" onClick={() => void runCalculation()}>{labels.calculate}</button>
            <button className="button secondary" type="button" onClick={reset}>{labels.reset}</button>
          </div>
          {error ? <div className="error">{error}</div> : null}
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
                <BeamPreview result={result} labels={labels} unitSystem={unitSystem} onExpand={setGraphModal} />
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
                {labels.why}: {result.stabilityReason}
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

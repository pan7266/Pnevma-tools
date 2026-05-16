"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { AxisIntervalGraph } from "@/components/AxisGraphs";
import { GraphModal } from "@/components/GraphModal";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { calculateAxisFromApi } from "@/lib/api/axis-client";
import { calculateAxisMechanics } from "@/lib/calculators/axis";
import { axisDefaultValues } from "@/lib/data/defaults";
import { AXIS_TEXT } from "@/lib/data/i18n";
import { CLEAN_MICROSTEP_COUNTS } from "@/lib/data/options";
import { formatCompact } from "@/lib/units/convert";
import type { AxisInputs, AxisKey, AxisMechanics, AxisResult, Lang, NumericInput } from "@/types";

type InfoModal = { title: string; body: string } | null;

const AXIS_EXTRA_TEXT: Record<string, Record<string, string>> = {
  en: {
    dpi: "DPI",
    intervalAxis: "Interval axis",
    lineIntervalOrDpi: "Line interval or DPI",
    useXAxis: "Use X axis",
    useYAxis: "Use Y axis",
    close: "Close",
    fieldInfo: "Field information",
    scanModeDescription: "Choose which machine axis moves between engraving scan lines.",
    lineIntervalDescription: "Distance between neighbouring engraved scan lines. Editing this value recalculates DPI.",
    dpiDescription: "Dots per inch equivalent. Editing DPI recalculates the line interval.",
    spotDiameterDescription: "Optional focused beam spot diameter used only for overlap guidance.",
    driveTypeDescription: "Select how this axis converts motor rotation into linear motion.",
    motorAngleDescription: "Motor full-step angle from the motor label or datasheet.",
    microsteppingDescription: "Driver microstep setting, for example 8, 16, 32, or 64.",
    controllerStepsDescription: "Use the value from Ruida, AWC, Trocen, GRBL, etc. Leave empty if unknown.",
    beltPitchDescription: "Distance between belt teeth in millimetres.",
    pulleyTeethDescription: "Number of teeth on the pulley that drives this axis.",
    screwPitchDescription: "Distance travelled by one screw thread turn in millimetres.",
    threadStartsDescription: "Number of independent thread starts on the lead screw.",
    directTravelDescription: "Real axis travel in millimetres for one motor revolution.",
    dualMotorModeDescription: "Leave as no dual motor unless this axis is driven by two motors.",
    secondMotorAngleDescription: "Second motor full-step angle for dual-motor setups.",
    secondPulleyTeethDescription: "Second motor pulley teeth for dual-motor belt setups.",
    secondMicrosteppingDescription: "Second driver microstep setting for dual-motor setups.",
  },
  el: {
    dpi: "DPI",
    intervalAxis: "Αξονας διαστηματος",
    lineIntervalOrDpi: "Διαστημα γραμμων η DPI",
    useXAxis: "Χρηση αξονα X",
    useYAxis: "Χρηση αξονα Y",
    close: "Κλεισιμο",
    fieldInfo: "Πληροφοριες πεδιου",
    scanModeDescription: "Διαλεξε ποιος αξονας μετακινειται αναμεσα στις γραμμες χαραξης.",
    lineIntervalDescription: "Αποσταση αναμεσα σε γειτονικες γραμμες. Αν αλλαξει, υπολογιζεται το DPI.",
    dpiDescription: "Αντιστοιχο dots per inch. Αν αλλαξει, υπολογιζεται το διαστημα γραμμων.",
    spotDiameterDescription: "Προαιρετικη διαμετρος spot για οδηγο επικαλυψης.",
    driveTypeDescription: "Πως ο αξονας μετατρεπει την περιστροφη μοτερ σε γραμμικη κινηση.",
    motorAngleDescription: "Γωνια πληρους βηματος απο την ετικετα η datasheet του μοτερ.",
    microsteppingDescription: "Ρυθμιση driver, π.χ. 8, 16, 32, 64.",
    controllerStepsDescription: "Χρησιμοποιησε την τιμη απο Ruida, AWC, Trocen, GRBL, κτλ. Αφησε το κενο αν δεν την ξερεις.",
    beltPitchDescription: "Αποσταση αναμεσα στα δοντια του ιμαντα σε mm.",
    pulleyTeethDescription: "Δοντια της τροχαλιας που κινει τον αξονα.",
    screwPitchDescription: "Μετακινηση για μια στροφη σπειρωματος σε mm.",
    threadStartsDescription: "Ποσες αρχες σπειρωματος εχει ο κοχλιας.",
    directTravelDescription: "Πραγματικη μετακινηση αξονα για μια περιστροφη μοτερ.",
    dualMotorModeDescription: "Αφησε χωρις διπλο μοτερ, εκτος αν ο αξονας κινειται με δυο μοτερ.",
    secondMotorAngleDescription: "Γωνια βηματος δευτερου μοτερ.",
    secondPulleyTeethDescription: "Δοντια τροχαλιας δευτερου μοτερ.",
    secondMicrosteppingDescription: "Microstepping δευτερου driver.",
  },
  de: {
    dpi: "DPI",
    intervalAxis: "Intervallachse",
    lineIntervalOrDpi: "Linienabstand oder DPI",
    useXAxis: "X-Achse verwenden",
    useYAxis: "Y-Achse verwenden",
    close: "Schliessen",
  },
  fr: {
    dpi: "DPI",
    intervalAxis: "Axe d'intervalle",
    lineIntervalOrDpi: "Intervalle ou DPI",
    useXAxis: "Utiliser X",
    useYAxis: "Utiliser Y",
    close: "Fermer",
  },
  es: {
    dpi: "DPI",
    intervalAxis: "Eje de intervalo",
    lineIntervalOrDpi: "Intervalo o DPI",
    useXAxis: "Usar eje X",
    useYAxis: "Usar eje Y",
    close: "Cerrar",
  },
  it: {
    dpi: "DPI",
    intervalAxis: "Asse intervallo",
    lineIntervalOrDpi: "Intervallo o DPI",
    useXAxis: "Usa asse X",
    useYAxis: "Usa asse Y",
    close: "Chiudi",
  },
  tr: {
    dpi: "DPI",
    intervalAxis: "Aralik ekseni",
    lineIntervalOrDpi: "Cizgi araligi veya DPI",
    useXAxis: "X eksenini kullan",
    useYAxis: "Y eksenini kullan",
    close: "Kapat",
  },
};

function stripGreekAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getPack(lang: Lang): Record<string, string> {
  const packs = AXIS_TEXT as Readonly<Record<string, Readonly<Record<string, string>>>>;
  const source = { ...packs.en, ...(packs[lang] || {}) };
  const extra = { ...AXIS_EXTRA_TEXT.en, ...(AXIS_EXTRA_TEXT[lang] || {}) };
  const merged = { ...source, ...extra };
  if (lang !== "el") return merged;
  return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, stripGreekAccents(value)]));
}

function format(value: number | null | undefined, decimals = 4, fallback = "N/A"): string {
  return Number.isFinite(value) ? Number(value).toFixed(decimals) : fallback;
}

function parsePositive(value: NumericInput): number | null {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function rounded(value: number, decimals = 8): number {
  return Number(value.toFixed(decimals));
}

function Field({
  label,
  value,
  step = "0.0001",
  description,
  onChange,
  onInfo,
}: {
  label: string;
  value: unknown;
  step?: string;
  description: string;
  onChange: (value: string) => void;
  onInfo: (modal: { title: string; body: string }) => void;
}) {
  return (
    <label>
      <span className="label-line">
        {label}
        <InfoButton title={label} body={description} onOpen={onInfo} />
      </span>
      <input
        type="number"
        min="0"
        step={step}
        placeholder={label}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="field-hint">{description}</span>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  description,
  onChange,
  onInfo,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  description: string;
  onChange: (value: string) => void;
  onInfo: (modal: { title: string; body: string }) => void;
}) {
  return (
    <label>
      <span className="label-line">
        {label}
        <InfoButton title={label} body={description} onOpen={onInfo} />
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
      <span className="field-hint">{description}</span>
    </label>
  );
}

function AxisCard({
  axisKey,
  axis,
  active,
  labels,
  onChange,
  onInfo,
}: {
  axisKey: AxisKey;
  axis: AxisMechanics;
  active: boolean;
  labels: Record<string, string>;
  onChange: (axisKey: AxisKey, field: keyof AxisMechanics, value: string) => void;
  onInfo: (modal: { title: string; body: string }) => void;
}) {
  const isControllerOnly = axis.driveType === "controllerOnly";
  const showBelt = axis.driveType === "belt";
  const showLead = axis.driveType === "leadScrew";
  const showDirect = axis.driveType === "direct";
  const showDual = axis.dualMotorMode !== "none" && !isControllerOnly;
  const whyKey = axisKey === "x" ? "xWhy" : "yWhy";
  const calc = calculateAxisMechanics(axis);
  const desc = (key: string) => labels[`${key}Description`] || labels.fieldInfo;

  return (
    <details className={`axis-card ${active ? "active" : "inactive"}`} open={active}>
      <summary className="axis-header">
        <div>
          <h2>{axisKey.toUpperCase()} {labels.axisMechanics}</h2>
          <p>{labels[whyKey]}</p>
        </div>
        <span className="axis-badge">{active ? labels.activeForInterval : labels.notUsedNow}</span>
      </summary>
      <div className="axis-why">
        <strong>{labels.whatWeAskWhy}</strong>
        <p>{labels[whyKey]}</p>
      </div>
      <div className="axis-fields">
        <SelectField
          label={labels.driveType}
          value={axis.driveType}
          description={desc("driveType")}
          onInfo={onInfo}
          onChange={(value) => onChange(axisKey, "driveType", value)}
          options={[
            ["belt", labels.beltDrive],
            ["leadScrew", labels.leadScrewDrive],
            ["direct", labels.directDrive],
            ["controllerOnly", labels.controllerOnlyDrive],
          ]}
        />
        {!isControllerOnly ? (
          <>
            <Field label={labels.motorAngle} step="0.0001" value={axis.motorAngle} description={desc("motorAngle")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "motorAngle", value)} />
            <Field label={labels.microstepping} step="1" value={axis.microstepping} description={desc("microstepping")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "microstepping", value)} />
          </>
        ) : null}
        <Field label={labels.controllerStepsInput} step="0.0001" value={axis.controllerStepsPerMm ?? ""} description={labels.controllerStepsDescription} onInfo={onInfo} onChange={(value) => onChange(axisKey, "controllerStepsPerMm", value)} />
        {showBelt ? (
          <>
            <Field label={labels.beltPitch} value={axis.beltPitch} description={desc("beltPitch")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "beltPitch", value)} />
            <Field label={labels.pulleyTeeth} step="1" value={axis.pulleyTeeth} description={desc("pulleyTeeth")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "pulleyTeeth", value)} />
          </>
        ) : null}
        {showLead ? (
          <>
            <Field label={labels.screwPitch} value={axis.screwPitch} description={desc("screwPitch")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "screwPitch", value)} />
            <Field label={labels.threadStarts} step="1" value={axis.threadStarts} description={desc("threadStarts")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "threadStarts", value)} />
          </>
        ) : null}
        {showDirect ? (
          <Field label={labels.directTravel} value={axis.directTravelPerRev} description={desc("directTravel")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "directTravelPerRev", value)} />
        ) : null}
        <SelectField
          label={labels.dualMotorMode}
          value={axis.dualMotorMode}
          description={desc("dualMotorMode")}
          onInfo={onInfo}
          onChange={(value) => onChange(axisKey, "dualMotorMode", value)}
          options={[
            ["none", labels.noDual],
            ["normalGantry", labels.normalGantry],
            ["specialRatio", labels.specialRatio],
          ]}
        />
        {showDual ? (
          <>
            <Field label={labels.secondMotorAngle} value={axis.secondMotorAngle} description={desc("secondMotorAngle")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondMotorAngle", value)} />
            <Field label={labels.secondPulleyTeeth} step="1" value={axis.secondPulleyTeeth} description={desc("secondPulleyTeeth")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondPulleyTeeth", value)} />
            <Field label={labels.secondMicrostepping} step="1" value={axis.secondMicrostepping} description={desc("secondMicrostepping")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondMicrostepping", value)} />
          </>
        ) : null}
        <p className="small">{calc.valid ? `${labels.mmPerMicrostep}: ${format(calc.mmPerMicrostep, 6)} mm` : calc.reason}</p>
      </div>
    </details>
  );
}

export function AxisCalculator() {
  const { lang, theme, unitSystem } = useAppSettings();
  const labels = useMemo(() => getPack(lang), [lang]);
  const [values, setValues] = useState<AxisInputs>({ ...axisDefaultValues, language: lang, theme, unitSystem });
  const [result, setResult] = useState<AxisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModal>(null);

  useEffect(() => {
    setValues((current) => ({ ...current, language: lang, theme, unitSystem }));
  }, [lang, theme, unitSystem]);

  const runCalculation = useCallback(async () => {
    try {
      setError(null);
      setResult(await calculateAxisFromApi(values));
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.invalidInputs);
    }
  }, [labels.invalidInputs, values]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (values.liveCalculation) void runCalculation();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [runCalculation, values.liveCalculation]);

  function updateAxis(axisKey: AxisKey, field: keyof AxisMechanics, value: string) {
    setValues((current) => ({
      ...current,
      axes: {
        ...current.axes,
        [axisKey]: {
          ...current.axes[axisKey],
          [field]: value,
        },
      },
    }));
  }

  function updateRoot<K extends keyof AxisInputs>(field: K, value: AxisInputs[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateLineInterval(value: string) {
    setValues((current) => {
      const interval = parsePositive(value);
      return {
        ...current,
        lineInterval: value,
        dpi: interval ? rounded(25.4 / interval, 4) : current.dpi,
      };
    });
  }

  function updateDpi(value: string) {
    setValues((current) => {
      const dpi = parsePositive(value);
      return {
        ...current,
        dpi: value,
        lineInterval: dpi ? rounded(25.4 / dpi, 8) : current.lineInterval,
      };
    });
  }

  function setIntervalAxis(axisKey: AxisKey) {
    updateRoot("scanMode", axisKey === "x" ? "vertical" : "horizontal");
  }

  const activeAxis = values.scanMode === "horizontal" ? "y" : "x";
  const calc = result?.calc;
  const interval = result?.interval;

  return (
    <main className="app axis-tool">
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
        <div className="axis-choice-row" aria-label={labels.intervalAxis}>
          <label className="axis-choice">
            <input type="checkbox" checked={activeAxis === "x"} onChange={(event) => event.target.checked && setIntervalAxis("x")} />
            <span>{labels.useXAxis}</span>
          </label>
          <label className="axis-choice">
            <input type="checkbox" checked={activeAxis === "y"} onChange={(event) => event.target.checked && setIntervalAxis("y")} />
            <span>{labels.useYAxis}</span>
          </label>
        </div>
      </header>

      <section className="panel panel-pad toolbar axis-toolbar" aria-label="Global settings">
        <SelectField
          label={labels.scanMode}
          value={values.scanMode}
          description={labels.scanModeDescription}
          onInfo={setInfoModal}
          onChange={(value) => updateRoot("scanMode", value as AxisInputs["scanMode"])}
          options={[
            ["horizontal", labels.horizontalScan],
            ["vertical", labels.verticalScan],
          ]}
        />
        <Field label={labels.lineInterval} value={values.lineInterval ?? ""} description={labels.lineIntervalDescription} onInfo={setInfoModal} onChange={updateLineInterval} />
        <Field label={labels.dpi} value={values.dpi ?? ""} step="0.01" description={labels.dpiDescription} onInfo={setInfoModal} onChange={updateDpi} />
        <Field label={labels.spotDiameter} value={values.spotDiameter ?? ""} description={labels.spotDiameterDescription} onInfo={setInfoModal} onChange={(value) => updateRoot("spotDiameter", value)} />
        <div className="stack">
          <button className="button" type="button" onClick={() => void runCalculation()}>{labels.calculate}</button>
          <label className="check-label">
            <input type="checkbox" checked={values.liveCalculation} onChange={(event) => updateRoot("liveCalculation", event.target.checked)} />
            <span>{labels.liveCalculation}</span>
          </label>
        </div>
      </section>

      <section className="axis-layout">
        <aside className="stack axis-grid" aria-label="Axis mechanics">
          <AxisCard axisKey="x" axis={values.axes.x} active={activeAxis === "x"} labels={labels} onChange={updateAxis} onInfo={setInfoModal} />
          <AxisCard axisKey="y" axis={values.axes.y} active={activeAxis === "y"} labels={labels} onChange={updateAxis} onInfo={setInfoModal} />
        </aside>

        <section className="panel">
          <div className="panel-pad">
            {error ? <div className="error">{error}</div> : null}
            <div className="readouts">
              <MetricCard
                label="Status"
                value={interval ? (interval.clean ? labels.clean : labels.notClean) : labels.notAvailable}
                sub={interval ? (interval.clean ? labels.cleanExplanation : labels.notCleanExplanation) : calc?.reason}
                tone={interval ? (interval.clean ? "ok" : "warn filled") : ""}
              />
              <MetricCard
                label={labels.activeAxis}
                value={activeAxis === "x" ? labels.axisX : labels.axisY}
                sub={values.scanMode === "horizontal" ? labels.horizontalMeaning : labels.verticalMeaning}
              />
              <MetricCard
                label={labels.intervalInMicrosteps}
                value={interval ? format(interval.intervalMicrosteps, 4) : labels.notAvailable}
                sub={interval ? `${labels.nearestCleanInterval}: ${format(interval.nearestCleanInterval, 6)} mm | ${format(interval.nearestCleanDpi, 1)} DPI` : "-"}
              />
            </div>

            <div className="panels">
              <article className="mini-panel">
                <h2>{labels.axisResolution}</h2>
                <div className="kv"><span>{labels.driveType}</span><span>{result ? labels[`${result.activeAxis.driveType}Drive`] || result.activeAxis.driveType : "-"}</span></div>
                <div className="kv"><span>{labels.travelPerRev}</span><span>{format(calc?.travelPerRev, 6)} mm</span></div>
                <div className="kv"><span>{labels.fullStepsPerRev}</span><span>{format(calc?.fullStepsPerRev, 2)}</span></div>
                <div className="kv"><span>{labels.microstepsPerRev}</span><span>{format(calc?.microstepsPerRev, 2)}</span></div>
                <div className="kv"><span>{labels.stepsPerMm}</span><span>{format(calc?.stepsPerMm, 4)}</span></div>
                <div className="kv"><span>{labels.mmPerMicrostep}</span><span>{format(calc?.mmPerMicrostep, 6)} mm</span></div>
              </article>

              <article className={`mini-panel ${result?.controller.className || ""}`}>
                <h2>{labels.controllerComparison}</h2>
                <div className="kv"><span>{labels.controllerSteps}</span><span>{result ? format(Number(result.activeAxis.controllerStepsPerMm), 4) : labels.notAvailable}</span></div>
                <div className="kv"><span>{labels.controllerDiff}</span><span>{result?.controller.diffPercent === null || result?.controller.diffPercent === undefined ? labels.notAvailable : `${format(result.controller.diffPercent, 3)}%`}</span></div>
                <div className="kv"><span>{labels.controllerStatus}</span><span>{result ? labels[result.controller.statusKey] : "-"}</span></div>
                <p className="small">{result ? labels[result.controller.noteKey] : "-"}</p>
              </article>

              <article className={`mini-panel ${result?.spot?.className || ""}`}>
                <h2>{labels.spotLogic}</h2>
                <div className="kv"><span>{labels.spotDiameterOut}</span><span>{format(Number(values.spotDiameter), 4)} mm</span></div>
                <div className="kv"><span>{labels.intervalSpotRatio}</span><span>{format(result?.spot?.ratio, 3)}</span></div>
                <div className="kv"><span>{labels.overlap}</span><span>{result?.spot ? `${format(result.spot.overlap, 1)}%` : labels.notAvailable}</span></div>
                <div className="kv"><span>{labels.spotStatus}</span><span>{result?.spot ? labels[result.spot.statusKey] : labels.notAvailable}</span></div>
                <p className="small">{result?.spot ? labels[result.spot.textKey] : labels.spotNoValue}</p>
              </article>
            </div>

            <details className="clean-intervals" open>
              <summary>{labels.cleanIntervals}</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{labels.microsteps}</th>
                      <th>{labels.cleanInterval}</th>
                      <th>{labels.dpiEquivalent}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc?.valid && calc.mmPerMicrostep > 0 ? CLEAN_MICROSTEP_COUNTS.map((microsteps) => {
                      const cleanInterval = microsteps * calc.mmPerMicrostep;
                      const dpi = 25.4 / cleanInterval;
                      return (
                        <tr key={microsteps}>
                          <td>{microsteps}</td>
                          <td>{format(cleanInterval, 6)}</td>
                          <td>{format(dpi, 2)}</td>
                        </tr>
                      );
                    }) : null}
                  </tbody>
                </table>
              </div>
            </details>

            <div className="info-box">
              <strong>{labels.microsteppingTitle}</strong>
              <p>{labels.microsteppingExplain1}</p>
              <p>{labels.microsteppingExplain2}</p>
            </div>
          </div>
        </section>

        <aside className="panel visual-panel">
          {result ? <AxisIntervalGraph result={result} labels={labels} onExpand={() => setGraphOpen(true)} /> : null}
        </aside>
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

      {graphOpen && result ? (
        <GraphModal title={labels.intervalGraphTitle} closeLabel={labels.close} onClose={() => setGraphOpen(false)}>
          <AxisIntervalGraph result={result} labels={labels} expanded />
        </GraphModal>
      ) : null}
    </main>
  );
}

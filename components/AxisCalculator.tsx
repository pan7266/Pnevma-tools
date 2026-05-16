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
import {
  displayLengthValue,
  displayStepsPerLengthValue,
  formatLength,
  formatStepsPerLength,
  lengthUnit,
  parseLengthValue,
  parseStepsPerLengthValue,
} from "@/lib/units/convert";
import type { AxisInputs, AxisKey, AxisMechanics, AxisResult, Lang, NumericInput } from "@/types";

type InfoModal = { title: string; body: string } | null;

const AXIS_EXTRA_TEXT: Record<string, Record<string, string>> = {
  en: {
    status: "Status",
    dpi: "DPI",
    intervalAxis: "Interval axis",
    lineIntervalOrDpi: "Line interval or DPI",
    useXAxis: "X interval",
    useYAxis: "Y interval",
    horizontalShort: "X scan / Y interval",
    verticalShort: "Y scan / X interval",
    beltPitchPreset: "Belt pitch preset",
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
    status: "Κατάσταση",
    dpi: "DPI",
    intervalAxis: "Αξονας διαστηματος",
    lineIntervalOrDpi: "Διαστημα γραμμων η DPI",
    useXAxis: "Διαστημα X",
    useYAxis: "Διαστημα Y",
    horizontalShort: "Σαρωση X / διαστημα Y",
    verticalShort: "Σαρωση Y / διαστημα X",
    beltPitchPreset: "Προεπιλογη βηματος ιμαντα",
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

const BELT_PITCH_PRESETS = [
  { key: "MXL", label: "MXL", mm: 2.032 },
  { key: "GT2", label: "GT2", mm: 2 },
] as const;

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

function inputPlaceholder(example: string) {
  return `(${example})`;
}

function labelWithUnit(label: string, unit: string) {
  const cleaned = label
    .replace(/\s*\((mm|in)\)/gi, "")
    .replace(/\s+(mm|in)$/gi, "")
    .replace(/\s+mm$/i, "")
    .replace(/\s+in$/i, "");
  return `${cleaned} (${unit})`;
}

function stepsLabel(label: string, unit: string) {
  const optional = /\boptional\b/i.test(label);
  const cleaned = label
    .replace(/\s*\boptional\b/gi, "")
    .replace(/steps\/(mm|in)/gi, "steps")
    .trim();
  return `${cleaned}/${unit}${optional ? " optional" : ""}`;
}

function distancePerMicrostepLabel(label: string, unit: string) {
  return label
    .replace(/mm\s+per\s+microstep/gi, `${unit} per microstep`)
    .replace(/mm\s+ανα\s+μικροβημα/gi, `${unit} ανα μικροβημα`);
}

function Field({
  label,
  value,
  step = "0.0001",
  placeholder,
  description,
  onChange,
  onInfo,
}: {
  label: string;
  value: unknown;
  step?: string;
  placeholder?: string;
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
        placeholder={placeholder ? inputPlaceholder(placeholder) : undefined}
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
  unitSystem,
  onChange,
  onInfo,
}: {
  axisKey: AxisKey;
  axis: AxisMechanics;
  active: boolean;
  labels: Record<string, string>;
  unitSystem: AxisInputs["unitSystem"];
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
  const unit = lengthUnit(unitSystem);
  const selectedPitch = BELT_PITCH_PRESETS.find((preset) => Math.abs(Number(axis.beltPitch) - preset.mm) < 0.0001)?.key || "custom";

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
            <Field label={labels.motorAngle} step="0.0001" placeholder="0.9" value={axis.motorAngle} description={desc("motorAngle")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "motorAngle", value)} />
            <Field label={labels.microstepping} step="1" placeholder="16" value={axis.microstepping} description={desc("microstepping")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "microstepping", value)} />
          </>
        ) : null}
        <Field
          label={stepsLabel(labels.controllerStepsInput, unit)}
          step="0.0001"
          placeholder={unitSystem === "imperial" ? "4000 steps/in" : "157.48 steps/mm"}
          value={displayStepsPerLengthValue(axis.controllerStepsPerMm, unitSystem)}
          description={labels.controllerStepsDescription}
          onInfo={onInfo}
          onChange={(value) => onChange(axisKey, "controllerStepsPerMm", parseStepsPerLengthValue(value, unitSystem))}
        />
        {showBelt ? (
          <>
            <div>
              <span className="label-line">
                {labels.beltPitchPreset}
                <InfoButton title={labels.beltPitchPreset} body={desc("beltPitch")} onOpen={onInfo} />
              </span>
              <div className="preset-row" role="group" aria-label={labels.beltPitchPreset}>
                {BELT_PITCH_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    className={`preset-button ${selectedPitch === preset.key ? "active" : ""}`}
                    type="button"
                    onClick={() => onChange(axisKey, "beltPitch", String(preset.mm))}
                  >
                    {preset.label} {formatLength(preset.mm, unitSystem, 3)}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label={labelWithUnit(labels.beltPitch, unit)}
              value={displayLengthValue(axis.beltPitch, unitSystem, 4)}
              placeholder={unitSystem === "imperial" ? "0.08 in" : "2.032 mm"}
              description={desc("beltPitch")}
              onInfo={onInfo}
              onChange={(value) => onChange(axisKey, "beltPitch", parseLengthValue(value, unitSystem))}
            />
            <Field label={labels.pulleyTeeth} step="1" placeholder="20" value={axis.pulleyTeeth} description={desc("pulleyTeeth")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "pulleyTeeth", value)} />
          </>
        ) : null}
        {showLead ? (
          <>
            <Field label={labelWithUnit(labels.screwPitch, unit)} value={displayLengthValue(axis.screwPitch, unitSystem, 4)} placeholder={unitSystem === "imperial" ? "0.079 in" : "2 mm"} description={desc("screwPitch")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "screwPitch", parseLengthValue(value, unitSystem))} />
            <Field label={labels.threadStarts} step="1" placeholder="4" value={axis.threadStarts} description={desc("threadStarts")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "threadStarts", value)} />
          </>
        ) : null}
        {showDirect ? (
          <Field label={labelWithUnit(labels.directTravel, unit)} value={displayLengthValue(axis.directTravelPerRev, unitSystem, 4)} placeholder={unitSystem === "imperial" ? "1.6 in" : "40.64 mm"} description={desc("directTravel")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "directTravelPerRev", parseLengthValue(value, unitSystem))} />
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
            <Field label={labels.secondMotorAngle} placeholder="0.9" value={axis.secondMotorAngle} description={desc("secondMotorAngle")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondMotorAngle", value)} />
            <Field label={labels.secondPulleyTeeth} step="1" placeholder="20" value={axis.secondPulleyTeeth} description={desc("secondPulleyTeeth")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondPulleyTeeth", value)} />
            <Field label={labels.secondMicrostepping} step="1" placeholder="16" value={axis.secondMicrostepping} description={desc("secondMicrostepping")} onInfo={onInfo} onChange={(value) => onChange(axisKey, "secondMicrostepping", value)} />
          </>
        ) : null}
        <p className="small">{calc.valid ? `${distancePerMicrostepLabel(labels.mmPerMicrostep, unit)}: ${formatLength(calc.mmPerMicrostep, unitSystem, 6)}` : calc.reason}</p>
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
  const unit = lengthUnit(unitSystem);

  useEffect(() => {
    setValues((current) => ({ ...current, language: lang, theme, unitSystem }));
  }, [lang, theme, unitSystem]);

  const runCalculation = useCallback(async () => {
    try {
      setError(null);
      setResult(await calculateAxisFromApi(values));
    } catch (err) {
      setError(labels.invalidInputs);
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

  function updateLineInterval(displayValue: string) {
    setValues((current) => {
      const value = parseLengthValue(displayValue, unitSystem);
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

  function updateSpotDiameter(displayValue: string) {
    updateRoot("spotDiameter", parseLengthValue(displayValue, unitSystem));
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
        <div className="mode-field">
          <span className="label-line">
            {labels.scanMode}
            <InfoButton title={labels.scanMode} body={labels.scanModeDescription} onOpen={setInfoModal} />
          </span>
          <div className="mode-toggle-group" role="group" aria-label={labels.scanMode}>
            <button className={`mode-toggle ${values.scanMode === "horizontal" ? "active" : ""}`} type="button" onClick={() => updateRoot("scanMode", "horizontal")}>
              {labels.horizontalShort}
            </button>
            <button className={`mode-toggle ${values.scanMode === "vertical" ? "active" : ""}`} type="button" onClick={() => updateRoot("scanMode", "vertical")}>
              {labels.verticalShort}
            </button>
          </div>
          <span className="field-hint">{labels.scanModeDescription}</span>
        </div>
        <Field label={labelWithUnit(labels.lineInterval, unit)} value={displayLengthValue(values.lineInterval, unitSystem, 6)} placeholder={unitSystem === "imperial" ? "0.0024 in" : "0.06 mm"} description={labels.lineIntervalDescription} onInfo={setInfoModal} onChange={updateLineInterval} />
        <Field label={labels.dpi} value={values.dpi ?? ""} step="0.01" placeholder="423.33 DPI" description={labels.dpiDescription} onInfo={setInfoModal} onChange={updateDpi} />
        <Field label={labelWithUnit(labels.spotDiameter, unit)} value={displayLengthValue(values.spotDiameter, unitSystem, 6)} placeholder={unitSystem === "imperial" ? "0.0047 in" : "0.12 mm"} description={labels.spotDiameterDescription} onInfo={setInfoModal} onChange={updateSpotDiameter} />
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
          <AxisCard axisKey="x" axis={values.axes.x} active={activeAxis === "x"} labels={labels} unitSystem={unitSystem} onChange={updateAxis} onInfo={setInfoModal} />
          <AxisCard axisKey="y" axis={values.axes.y} active={activeAxis === "y"} labels={labels} unitSystem={unitSystem} onChange={updateAxis} onInfo={setInfoModal} />
        </aside>

        <section className="panel">
          <div className="panel-pad">
            {error ? <div className="error">{error}</div> : null}
            <div className="readouts">
              <MetricCard
                label={labels.status}
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
                sub={interval ? `${labels.nearestCleanInterval}: ${formatLength(interval.nearestCleanInterval, unitSystem, 6)} | ${format(interval.nearestCleanDpi, 1)} DPI` : "-"}
              />
            </div>

            <div className="panels">
              <article className="mini-panel">
                <h2>{labels.axisResolution}</h2>
                <div className="kv"><span>{labels.driveType}</span><span>{result ? labels[`${result.activeAxis.driveType}Drive`] || result.activeAxis.driveType : "-"}</span></div>
                <div className="kv"><span>{labelWithUnit(labels.travelPerRev, unit)}</span><span>{calc?.travelPerRev ? formatLength(calc.travelPerRev, unitSystem, 6) : labels.notAvailable}</span></div>
                <div className="kv"><span>{labels.fullStepsPerRev}</span><span>{format(calc?.fullStepsPerRev, 2)}</span></div>
                <div className="kv"><span>{labels.microstepsPerRev}</span><span>{format(calc?.microstepsPerRev, 2)}</span></div>
                <div className="kv"><span>{stepsLabel(labels.stepsPerMm, unit)}</span><span>{formatStepsPerLength(calc?.stepsPerMm, unitSystem, 4)}</span></div>
                <div className="kv"><span>{distancePerMicrostepLabel(labels.mmPerMicrostep, unit)}</span><span>{calc?.mmPerMicrostep ? formatLength(calc.mmPerMicrostep, unitSystem, 6) : labels.notAvailable}</span></div>
              </article>

              <article className={`mini-panel ${result?.controller.className || ""}`}>
                <h2>{labels.controllerComparison}</h2>
                <div className="kv"><span>{stepsLabel(labels.controllerSteps, unit)}</span><span>{result && Number.isFinite(Number(result.activeAxis.controllerStepsPerMm)) ? formatStepsPerLength(Number(result.activeAxis.controllerStepsPerMm), unitSystem, 4) : labels.notAvailable}</span></div>
                <div className="kv"><span>{labels.controllerDiff}</span><span>{result?.controller.diffPercent === null || result?.controller.diffPercent === undefined ? labels.notAvailable : `${format(result.controller.diffPercent, 3)}%`}</span></div>
                <div className="kv"><span>{labels.controllerStatus}</span><span>{result ? labels[result.controller.statusKey] : "-"}</span></div>
                <p className="small">{result ? labels[result.controller.noteKey] : "-"}</p>
              </article>

              <article className={`mini-panel ${result?.spot?.className || ""}`}>
                <h2>{labels.spotLogic}</h2>
                <div className="kv"><span>{labelWithUnit(labels.spotDiameterOut, unit)}</span><span>{Number.isFinite(Number(values.spotDiameter)) ? formatLength(Number(values.spotDiameter), unitSystem, 4) : labels.notAvailable}</span></div>
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
                      <th>{labelWithUnit(labels.cleanInterval, unit)}</th>
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
                          <td>{formatLength(cleanInterval, unitSystem, 6)}</td>
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
          {result ? <AxisIntervalGraph result={result} labels={labels} unitSystem={unitSystem} onExpand={() => setGraphOpen(true)} /> : null}
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
          <AxisIntervalGraph result={result} labels={labels} unitSystem={unitSystem} expanded />
        </GraphModal>
      ) : null}
    </main>
  );
}

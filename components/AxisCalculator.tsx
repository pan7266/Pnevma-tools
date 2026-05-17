"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAppSettings } from "@/components/AppSettings";
import { AxisIntervalGraph, EngravingLineGraph } from "@/components/AxisGraphs";
import { GraphModal } from "@/components/GraphModal";
import { AxisIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { calculateAxisFromApi } from "@/lib/api/axis-client";
import { calculateAxisMechanics } from "@/lib/calculators/axis";
import { axisDefaultValues } from "@/lib/data/defaults";
import { MOTOR_PRESETS, getMotorPreset } from "@/lib/data/motors";
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
import { getLocale } from "@/locales";
import type { AxisInputs, AxisKey, AxisMechanics, AxisResult, MotorPreset, NumericInput } from "@/types";

type InfoModal = { title: string; body?: string; content?: ReactNode } | null;
type AxisGraphModal = "interval" | "engraving" | null;
const AXIS_STORAGE_KEY = "pnevma.axis.values.v3";

const BELT_PITCH_PRESETS = [
  { key: "MXL", label: "MXL", mm: 2.032 },
  { key: "GT2", label: "GT2", mm: 2 },
] as const;

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

function displayDpiValue(value: NumericInput) {
  const parsed = parsePositive(value);
  return parsed ? parsed.toFixed(1) : value ?? "";
}

function inputPlaceholder(example: string) {
  return example;
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
  const cleaned = label
    .replace(/\s*\boptional\b/gi, "")
    .replace(/steps\/(mm|in)/gi, "steps")
    .trim();
  return `${cleaned}/${unit}`;
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
  onInfo: (modal: Exclude<InfoModal, null>) => void;
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
  onInfo: (modal: Exclude<InfoModal, null>) => void;
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

function motorDetailsContent(preset: MotorPreset, labels: Record<string, string>) {
  return (
    <div className="lamp-details">
      <div className="kv"><span>{labels.frameSize}</span><span>{preset.frameSize}</span></div>
      <div className="kv"><span>{labels.stepAngle}</span><span>{preset.stepAngleDeg} deg</span></div>
      <div className="kv"><span>{labels.fullSteps}</span><span>{preset.fullStepsPerRev}</span></div>
      <div className="kv"><span>{labels.ratedCurrent}</span><span>{preset.ratedCurrentA ? `${preset.ratedCurrentA} A` : labels.unknown}</span></div>
      <div className="kv"><span>{labels.holdingTorque}</span><span>{preset.holdingTorque}</span></div>
      <div className="kv"><span>{labels.shaftType}</span><span>{preset.shaftType}</span></div>
      <p className="small">{preset.notes} {preset.estimated ? `(${labels.estimated})` : ""}</p>
      {preset.sourceUrl ? <a className="button source-link-button" href={preset.sourceUrl} target="_blank" rel="noreferrer">{labels.sourceLink}</a> : null}
    </div>
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
  onInfo: (modal: Exclude<InfoModal, null>) => void;
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
  const motorPreset = getMotorPreset(axis.motorPresetId);

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
            <div className="source-select-row motor-preset-row">
              <SelectField
                label={labels.motorPreset}
                value={axis.motorPresetId || ""}
                description={labels.manualOverride}
                onInfo={onInfo}
                onChange={(value) => onChange(axisKey, "motorPresetId", value)}
                options={[
                  ["", labels.manualOverride],
                  ...MOTOR_PRESETS.map((preset) => [preset.id, `${preset.name} (${preset.frameSize}, ${preset.stepAngleDeg} deg)`] as [string, string]),
                ]}
              />
              <button
                className="mini-button"
                type="button"
                disabled={!motorPreset}
                onClick={() => {
                  if (motorPreset) onInfo({ title: `${labels.motorDetails}: ${motorPreset.name}`, content: motorDetailsContent(motorPreset, labels) });
                }}
              >
                {labels.motorDetails}
              </button>
            </div>
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
            <SelectField
              label={labels.secondMotorPreset}
              value={axis.secondMotorPresetId || axis.motorPresetId || ""}
              description={labels.manualOverride}
              onInfo={onInfo}
              onChange={(value) => onChange(axisKey, "secondMotorPresetId", value)}
              options={[
                ["", labels.manualOverride],
                ...MOTOR_PRESETS.map((preset) => [preset.id, `${preset.name} (${preset.frameSize}, ${preset.stepAngleDeg} deg)`] as [string, string]),
              ]}
            />
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
  const labels = useMemo(() => getLocale(lang).axis, [lang]);
  const [values, setValues] = useState<AxisInputs>({ ...axisDefaultValues, language: lang, theme, unitSystem });
  const [storageReady, setStorageReady] = useState(false);
  const [result, setResult] = useState<AxisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphModal, setGraphModal] = useState<AxisGraphModal>(null);
  const [infoModal, setInfoModal] = useState<InfoModal>(null);
  const unit = lengthUnit(unitSystem);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AXIS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AxisInputs>;
        setValues((current) => ({
          ...current,
          ...parsed,
          language: lang,
          theme,
          unitSystem,
          axes: {
            x: { ...current.axes.x, ...parsed.axes?.x },
            y: { ...current.axes.y, ...parsed.axes?.y },
          },
        }));
      }
    } catch {
      window.localStorage.removeItem(AXIS_STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, [lang, theme, unitSystem]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(AXIS_STORAGE_KEY, JSON.stringify(values));
  }, [storageReady, values]);

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
    const preset = field === "motorPresetId" ? getMotorPreset(value) : null;
    const secondPreset = field === "secondMotorPresetId" ? getMotorPreset(value) : null;
    setValues((current) => ({
      ...current,
      axes: {
        ...current.axes,
        [axisKey]: {
          ...current.axes[axisKey],
          [field]: value,
          ...(preset ? { motorAngle: preset.stepAngleDeg, secondMotorPresetId: value, secondMotorAngle: preset.stepAngleDeg } : {}),
          ...(secondPreset ? { secondMotorAngle: secondPreset.stepAngleDeg } : {}),
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
        dpi: interval ? rounded(25.4 / interval, 1) : current.dpi,
      };
    });
  }

  function updateDpi(value: string) {
    setValues((current) => {
      const dpi = parsePositive(value);
      return {
        ...current,
        dpi: value,
        lineInterval: dpi ? rounded(25.4 / dpi, 4) : current.lineInterval,
      };
    });
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
            <AxisIcon />
          </div>
          <div>
            <h1>{labels.title}</h1>
            <p className="subhead">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="panel panel-pad toolbar axis-toolbar" aria-label={labels.lineIntervalOrDpi}>
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
        <Field label={labelWithUnit(labels.lineInterval, unit)} value={displayLengthValue(values.lineInterval, unitSystem, 4)} placeholder={unitSystem === "imperial" ? "0.0024 in" : "0.0600 mm"} description={labels.lineIntervalDescription} onInfo={setInfoModal} onChange={updateLineInterval} />
        <Field label={labels.dpi} value={displayDpiValue(values.dpi)} step="0.1" placeholder="423.3 DPI" description={labels.dpiDescription} onInfo={setInfoModal} onChange={updateDpi} />
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
                sub={interval ? `${labels.nearestCleanInterval}: ${formatLength(interval.nearestCleanInterval, unitSystem, 4)} | ${format(interval.nearestCleanDpi, 1)} DPI` : "-"}
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
                          <td>{formatLength(cleanInterval, unitSystem, 4)}</td>
                          <td>{format(dpi, 1)}</td>
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
          {result ? (
            <>
              <AxisIntervalGraph result={result} labels={labels} unitSystem={unitSystem} onExpand={() => setGraphModal("interval")} />
              <EngravingLineGraph result={result} labels={labels} unitSystem={unitSystem} onExpand={() => setGraphModal("engraving")} />
            </>
          ) : null}
        </aside>
      </section>

      {infoModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setInfoModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>{infoModal.title}</h2>
              <button className="button secondary modal-close" type="button" onClick={() => setInfoModal(null)} aria-label={labels.close}>x</button>
            </div>
            {infoModal.content ? infoModal.content : <p className="modal-body-text">{infoModal.body}</p>}
          </div>
        </div>
      ) : null}

      {graphModal && result ? (
        <GraphModal title={graphModal === "interval" ? labels.intervalGraphTitle : labels.engravingLineGraphTitle} closeLabel={labels.close} onClose={() => setGraphModal(null)}>
          {graphModal === "interval" ? (
            <AxisIntervalGraph result={result} labels={labels} unitSystem={unitSystem} expanded />
          ) : (
            <EngravingLineGraph result={result} labels={labels} unitSystem={unitSystem} expanded />
          )}
        </GraphModal>
      ) : null}
    </main>
  );
}

"use client";

import { FINISHES } from "@/lib/data/finishes";
import { FOCAL_LENGTHS, LENS_DIAMETERS } from "@/lib/data/lenses";
import { calculateSpot, getFilteredSources } from "@/lib/calculators/spot";
import { formatCompact, formatLength, formatNumber, formatOptionLength, lengthUnit, mmToInches } from "@/lib/units/convert";
import { useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Lang, SpotInputs, SpotResult, UnitSystem } from "@/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface GraphProps {
  values: SpotInputs;
  result: SpotResult;
  lang: Lang;
  unitSystem: UnitSystem;
  labels: Record<string, string>;
  onExpand?: (graph: "path" | "beam" | "finish" | "focal" | "source" | "pulse" | "expander" | "optical") => void;
  expanded?: boolean;
}

function graphKeydown(event: KeyboardEvent<HTMLDivElement>, action?: () => void) {
  if (!action) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function BeamPreview({
  result,
  labels,
  unitSystem,
  onExpand,
  expanded = false,
  onFocalLengthChange,
}: Pick<GraphProps, "result" | "labels" | "unitSystem" | "onExpand" | "expanded"> & {
  onFocalLengthChange?: (value: number) => void;
}) {
  const centerY = 112;
  const startX = 46;
  const lensX = 286;
  const endX = 760;
  const focalScale = (endX - lensX - 100) / 152.4;
  const focusX = clamp(lensX + result.focalLength * focalScale, lensX + 90, endX - 92);
  const incomingHalf = clamp(result.sourceBeam * 5.2, 18, 58);
  const lensHalf = clamp(result.lensDiameter * 2.35, 44, 82);
  const beamAtLensHalf = clamp(result.effectiveBeam * 5.2, 17, lensHalf - 7);
  const spotHalf = clamp(result.spot * 410, 3.2, 12);
  const outputHalf = clamp(spotHalf + (endX - focusX) * 0.18, 24, 62);
  const lensPath =
    result.shape.labelKey === "convex"
      ? `M${lensX - 13} ${centerY - lensHalf} C${lensX - 46} ${centerY - lensHalf * 0.54} ${lensX - 46} ${centerY + lensHalf * 0.54} ${lensX - 13} ${centerY + lensHalf} C${lensX + 20} ${centerY + lensHalf * 0.54} ${lensX + 20} ${centerY - lensHalf * 0.54} ${lensX - 13} ${centerY - lensHalf} Z`
      : `M${lensX - 18} ${centerY - lensHalf} C${lensX - 48} ${centerY - lensHalf * 0.58} ${lensX - 48} ${centerY + lensHalf * 0.58} ${lensX - 18} ${centerY + lensHalf} L${lensX + 18} ${centerY + lensHalf} C${lensX + 4} ${centerY + lensHalf * 0.36} ${lensX + 4} ${centerY - lensHalf * 0.36} ${lensX + 18} ${centerY - lensHalf} Z`;
  const open = onExpand ? () => onExpand("beam") : undefined;
  const rayColor = result.clipped ? "var(--amber)" : "var(--beam)";
  const paraxialColor = "var(--primary)";

  return (
    <div
      className={`hero-rail clickable-graph-hero ${expanded ? "expanded" : ""}`}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open}
      onKeyDown={(event) => graphKeydown(event, open)}
    >
      <svg viewBox="0 0 800 240" role="img" aria-label={labels.beamPathTitle}>
        <rect width="800" height="240" fill="transparent" />
        <line x1={startX} x2={endX} y1={centerY} y2={centerY} stroke="var(--axis)" strokeDasharray="5 7" opacity="0.72" />

        <path d={`M${startX} ${centerY - incomingHalf} L${lensX} ${centerY - beamAtLensHalf} L${focusX} ${centerY - spotHalf} L${endX} ${centerY - outputHalf}`} fill="none" stroke={rayColor} strokeWidth="1.8" strokeLinecap="round" />
        <path d={`M${startX} ${centerY + incomingHalf} L${lensX} ${centerY + beamAtLensHalf} L${focusX} ${centerY + spotHalf} L${endX} ${centerY + outputHalf}`} fill="none" stroke={rayColor} strokeWidth="1.8" strokeLinecap="round" />
        <path d={`M${startX} ${centerY - incomingHalf * 0.48} L${lensX} ${centerY - beamAtLensHalf * 0.48} L${focusX} ${centerY} L${endX} ${centerY + outputHalf * 0.48}`} fill="none" stroke={paraxialColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.72" />
        <path d={`M${startX} ${centerY + incomingHalf * 0.48} L${lensX} ${centerY + beamAtLensHalf * 0.48} L${focusX} ${centerY} L${endX} ${centerY - outputHalf * 0.48}`} fill="none" stroke={paraxialColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.72" />

        <path d={lensPath} fill="color-mix(in srgb, var(--primary) 34%, var(--panel-solid))" stroke="var(--primary)" strokeWidth="2" opacity="0.92" />
        <line x1={lensX} x2={lensX} y1={centerY - lensHalf - 12} y2={centerY + lensHalf + 12} stroke="var(--line)" strokeWidth="1" />

        <line x1={focusX} x2={focusX} y1={centerY - 40} y2={centerY + 40} stroke="var(--beam)" strokeWidth="1.4" strokeDasharray="4 5" />
        <ellipse cx={focusX} cy={centerY} rx={spotHalf} ry={Math.max(spotHalf * 1.7, 5)} fill="var(--beam)" opacity="0.9" />

        <text x={startX} y="32" fill="var(--muted)" fontSize="12">{labels.sourceBeam}: {formatLength(result.sourceBeam, unitSystem, 2)}</text>
        <text x={lensX} y={centerY + lensHalf + 28} fill="var(--muted)" fontSize="12" textAnchor="middle">{labels.lens}: {formatLength(result.lensDiameter, unitSystem, 2)}</text>
        <text x={focusX} y={centerY - 52} fill="var(--ink)" fontSize="13" fontWeight="900" textAnchor="middle">
          {labels.spotDiameter}: {formatLength(result.spot, unitSystem, 4)}
        </text>
        <text x={focusX} y={centerY + 62} fill="var(--muted)" fontSize="11" textAnchor="middle">
          {labels.focalLength}: {formatLength(result.focalLength, unitSystem, 2)}
        </text>
        <text x={endX} y="32" fill="var(--muted)" fontSize="12" textAnchor="end">
          {labels.effectiveBeam}: {formatLength(result.effectiveBeam, unitSystem, 2)}
        </text>
      </svg>
      {onFocalLengthChange ? (
        <div className="graph-slider-row" onClick={(event) => event.stopPropagation()}>
          <span>{labels.selectedFocalLength}</span>
          <input
            type="range"
            min="25.4"
            max="508"
            step="0.1"
            value={result.focalLength}
            aria-label={labels.selectedFocalLength}
            onChange={(event) => onFocalLengthChange(Number(event.target.value))}
          />
          <strong>{formatLength(result.focalLength, unitSystem, 2)}</strong>
        </div>
      ) : null}
    </div>
  );
}

export function PulseHzGraph({
  hz,
  selectedWatt,
  pulseEnergyMj,
  labels,
  expanded = false,
  onHzChange,
  onExpand,
}: {
  hz: number;
  selectedWatt: number;
  pulseEnergyMj: number;
  labels: Record<string, string>;
  expanded?: boolean;
  onHzChange: (hz: number) => void;
  onExpand?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [selectedX, setSelectedX] = useState<number | null>(null);
  const minHz = 1000;
  const maxHz = 100000;
  const width = 520;
  const height = expanded ? 300 : 160;
  const axisLeft = 42;
  const axisRight = width - 24;
  const axisW = axisRight - axisLeft;
  const normalizedHz = clamp((hz - minHz) / (maxHz - minHz), 0, 1);
  const barX = axisLeft + normalizedHz * axisW;
  const cycles = expanded ? 5 * zoom : 3;
  const path = Array.from({ length: 90 }, (_, index) => {
    const ratio = index / 89;
    const x = axisLeft + ratio * axisW;
    const y = height / 2 + Math.sin((ratio * cycles + pan) * Math.PI * 2) * (expanded ? 72 : 38);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  function pickHz(clientX: number, currentTarget: SVGSVGElement) {
    const rect = currentTarget.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left - axisLeft * (rect.width / width)) / (axisW * (rect.width / width)), 0, 1);
    onHzChange(Math.round((minHz + ratio * (maxHz - minHz)) / 100) * 100);
    setSelectedX(axisLeft + ratio * axisW);
  }

  return (
    <div className={`technical-preview pulse-preview ${expanded ? "expanded" : ""}`}>
      <div className="preview-head">
        <span>{labels.pulseGraphTitle}</span>
        <strong>{formatCompact(hz, 0)} Hz</strong>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={labels.pulseGraphTitle}
        onClick={(event) => {
          event.stopPropagation();
          if (!expanded) {
            onExpand?.();
            return;
          }
          pickHz(event.clientX, event.currentTarget);
        }}
        onPointerDown={(event: PointerEvent<SVGSVGElement>) => {
          if (!expanded) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pickHz(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event: PointerEvent<SVGSVGElement>) => {
          if (!expanded || event.buttons !== 1) return;
          pickHz(event.clientX, event.currentTarget);
        }}
      >
        <rect width={width} height={height} fill="transparent" />
        <line x1={axisLeft} x2={axisRight} y1={height / 2} y2={height / 2} stroke="var(--axis)" strokeWidth="1.5" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={expanded ? 3 : 2.2} />
        <line x1={barX} x2={barX} y1="20" y2={height - 26} stroke="var(--beam)" strokeWidth="4" strokeLinecap="round">
          <title>{labels.pulseSelectedHz}: {formatCompact(hz, 0)} Hz</title>
        </line>
        {selectedX ? <circle cx={selectedX} cy={height / 2} r="5" fill="var(--beam)" /> : null}
        <text x={axisLeft} y={height - 8} fill="var(--muted)" fontSize="11">{formatCompact(minHz, 0)} Hz</text>
        <text x={axisRight} y={height - 8} fill="var(--muted)" fontSize="11" textAnchor="end">{formatCompact(maxHz, 0)} Hz</text>
      </svg>
      <div className="preview-metrics">
        <span>{labels.pulseEnergyPerPulse}: <strong>{formatNumber(pulseEnergyMj, 3)} mJ</strong></span>
        <span>{labels.selectedWatt}: <strong>{formatCompact(selectedWatt, 2)} W</strong></span>
      </div>
      {expanded ? (
        <div className="graph-control-row">
          <button type="button" className="mini-button" onClick={() => setZoom((value) => clamp(value + 0.25, 0.5, 4))}>{labels.zoomIn}</button>
          <button type="button" className="mini-button" onClick={() => setZoom((value) => clamp(value - 0.25, 0.5, 4))}>{labels.zoomOut}</button>
          <button type="button" className="mini-button" onClick={() => setPan((value) => value - 0.12)}>{labels.panLeft}</button>
          <button type="button" className="mini-button" onClick={() => setPan((value) => value + 0.12)}>{labels.panRight}</button>
        </div>
      ) : onExpand ? (
        <button type="button" className="preview-open" onClick={onExpand}>{labels.expandGraph}</button>
      ) : null}
    </div>
  );
}

export function LensShapePreview({ shape, labels }: { shape: string; labels: Record<string, string> }) {
  const convex = shape === "convex";
  return (
    <div className="technical-preview optic-preview" aria-label={labels.lensPreviewTitle}>
      <div className="preview-head"><span>{labels.lensPreviewTitle}</span><strong>{convex ? labels.convex : labels.meniscus}</strong></div>
      <svg viewBox="0 0 220 130" role="img">
        <rect width="220" height="130" fill="transparent" />
        <line x1="18" x2="202" y1="65" y2="65" stroke="var(--axis)" strokeDasharray="5 6" />
        <path d={convex ? "M104 20 C64 35 64 95 104 110 C144 95 144 35 104 20Z" : "M91 20 C52 38 52 92 91 110 L126 110 C108 86 108 44 126 20Z"} fill="color-mix(in srgb, var(--primary) 28%, var(--panel-solid))" stroke="var(--primary)" strokeWidth="2" />
        <path d="M18 34 L104 49 L202 65 M18 96 L104 81 L202 65" fill="none" stroke="var(--beam)" strokeWidth="1.8" />
      </svg>
    </div>
  );
}

export function MirrorFinishPreview({ label, reflectivity, labels }: { label: string; reflectivity: number; labels: Record<string, string> }) {
  return (
    <div className="technical-preview optic-preview" aria-label={labels.mirrorPreviewTitle}>
      <div className="preview-head"><span>{labels.mirrorPreviewTitle}</span><strong>{formatCompact(reflectivity * 100, 2)}%</strong></div>
      <svg viewBox="0 0 220 130" role="img">
        <defs>
          <linearGradient id="mirror-sheen" x1="0" x2="1">
            <stop offset="0" stopColor="var(--panel-solid)" />
            <stop offset="0.48" stopColor="var(--primary)" stopOpacity="0.42" />
            <stop offset="1" stopColor="var(--amber)" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="220" height="130" fill="transparent" />
        <g transform="translate(80 24) rotate(-35 34 42)">
          <rect x="0" y="0" width="68" height="84" rx="8" fill="url(#mirror-sheen)" stroke="var(--line)" strokeWidth="2" />
          <line x1="13" x2="55" y1="18" y2="18" stroke="var(--panel-solid)" opacity="0.55" />
          <line x1="13" x2="55" y1="34" y2="34" stroke="var(--panel-solid)" opacity="0.35" />
        </g>
        <path d="M24 94 L97 72 L196 34" fill="none" stroke="var(--beam)" strokeWidth="2" />
        <text x="110" y="116" fill="var(--muted)" fontSize="11" textAnchor="middle">{label}</text>
      </svg>
    </div>
  );
}

export function ExpanderGraph({ result, labels, unitSystem, onExpand }: Pick<GraphProps, "result" | "labels" | "unitSystem" | "onExpand">) {
  const open = onExpand ? () => onExpand("expander") : undefined;
  const inHalf = clamp(result.sourceBeam * 6, 12, 46);
  const outHalf = clamp(result.expandedBeam * 4, 14, 62);
  return (
    <div className="technical-preview expander-preview clickable-graph-hero" role={open ? "button" : undefined} tabIndex={open ? 0 : undefined} onClick={open} onKeyDown={(event) => graphKeydown(event, open)}>
      <div className="preview-head"><span>{labels.expanderGraphTitle}</span><strong>{formatCompact(result.expanderMultiplier, 2)}x</strong></div>
      <svg viewBox="0 0 520 170" role="img" aria-label={labels.expanderGraphTitle}>
        <rect width="520" height="170" fill="transparent" />
        <path d={`M32 ${85 - inHalf} L178 ${85 - inHalf} L332 ${85 - outHalf} L488 ${85 - outHalf}`} fill="none" stroke="var(--beam)" strokeWidth="2" />
        <path d={`M32 ${85 + inHalf} L178 ${85 + inHalf} L332 ${85 + outHalf} L488 ${85 + outHalf}`} fill="none" stroke="var(--beam)" strokeWidth="2" />
        <rect x="178" y="40" width="44" height="90" rx="8" fill="color-mix(in srgb, var(--primary) 20%, var(--panel-solid))" stroke="var(--primary)" />
        <rect x="288" y="28" width="44" height="114" rx="8" fill="color-mix(in srgb, var(--green) 20%, var(--panel-solid))" stroke="var(--green)" />
        <text x="32" y="24" fill="var(--muted)" fontSize="11">{labels.sourceBeam}: {formatLength(result.sourceBeam, unitSystem, 2)}</text>
        <text x="488" y="24" fill={result.clipped ? "var(--amber)" : "var(--muted)"} fontSize="11" textAnchor="end">{labels.expandedBeam}: {formatLength(result.expandedBeam, unitSystem, 2)}</text>
        {result.clipped ? <text x="260" y="156" fill="var(--amber)" fontSize="12" fontWeight="900" textAnchor="middle">{labels.expandedTooLarge}</text> : null}
      </svg>
    </div>
  );
}

export function OpticalPathGraph({ result, labels, unitSystem, onExpand, expanded = false }: Pick<GraphProps, "result" | "labels" | "unitSystem" | "onExpand" | "expanded">) {
  const [selectedId, setSelectedId] = useState(result.opticalStages[0]?.id || "source");
  const open = onExpand ? () => onExpand("optical") : undefined;
  const selected = result.opticalStages.find((stage) => stage.id === selectedId) || result.opticalStages[0];
  const points = result.opticalStages.map((stage, index) => {
    const x = 58 + index * (684 / Math.max(result.opticalStages.length - 1, 1));
    const y = index < 4 ? 82 : 158;
    return { stage, x, y };
  });
  return (
    <div className={`graph-panel optical-path-panel ${expanded ? "expanded" : ""}`}>
      <div className="graph-head">
        <div>
          <h2>{labels.fullOpticalPathTitle}</h2>
          <p>{labels.assumptionsTitle}</p>
        </div>
      </div>
      <svg className="graph optical-path-graph" viewBox="0 0 820 320" role="img" aria-label={labels.fullOpticalPathTitle} onClick={open}>
        <rect width="820" height="320" fill="transparent" />
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="var(--beam)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(({ stage, x, y }) => (
          <g key={stage.id} role="button" tabIndex={0} onClick={(event) => {
            event.stopPropagation();
            setSelectedId(stage.id);
          }} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setSelectedId(stage.id);
          }}>
            <circle cx={x} cy={y} r={selectedId === stage.id ? 22 : 17} fill={stage.warning ? "var(--amber)" : stage.kind === "surface" ? "var(--green)" : "var(--panel-solid)"} stroke={stage.kind === "source" ? "var(--beam)" : "var(--primary)"} strokeWidth="3">
              <title>{labels[stage.labelKey]} · {labels.energyAfterStage}: {formatCompact(stage.energyWatt, 2)} W</title>
            </circle>
            <text x={x} y={y + 44} fill="var(--ink)" fontSize="11" fontWeight="900" textAnchor="middle">{labels[stage.labelKey]}</text>
            <text x={x} y={y + 60} fill="var(--muted)" fontSize="10" textAnchor="middle">{formatCompact(stage.energyPercent, 1)}%</text>
          </g>
        ))}
      </svg>
      {selected ? (
        <div className={`line-detail ${selected.warning ? "warn" : "ok"}`}>
          <strong>{labels[selected.labelKey]} · {labels.energyAfterStage}: {formatCompact(selected.energyWatt, 2)} W ({formatCompact(selected.energyPercent, 1)}%)</strong>
          <span>{labels.beamDiameter}: {formatLength(selected.beamMm, unitSystem, selected.kind === "surface" ? 4 : 2)} · {labels.transmission}: {formatCompact(selected.transmission * 100, 2)}%</span>
          {selected.diameterMm ? <span>{labels.warningAperture}: {formatLength(selected.beamMm, unitSystem, 2)} / {formatLength(selected.diameterMm, unitSystem, 2)}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function PowerPathGraph({ result, labels, onExpand, expanded = false }: Pick<GraphProps, "result" | "labels" | "onExpand" | "expanded">) {
  const railWidth = 480;
  const deliveredRatio = result.selectedWatt > 0 ? result.deliveredWatt / result.selectedWatt : 0;
  const deliveredWidth = clamp(deliveredRatio, 0, 1) * railWidth;
  const lossWidth = Math.max(railWidth - deliveredWidth, 0);
  const statusColor =
    result.beamStability === "unstable"
      ? "var(--beam)"
      : result.beamStability === "borderline"
        ? "var(--amber)"
        : "var(--green)";

  const open = onExpand ? () => onExpand("path") : undefined;

  return (
    <div
      className={`hero-rail clickable-graph-hero ${expanded ? "expanded" : ""}`}
      aria-label={labels.pathGraphTitle}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open}
      onKeyDown={(event) => graphKeydown(event, open)}
    >
      <svg viewBox="0 0 800 202" role="img" aria-label={labels.pathGraphTitle}>
        <rect width="800" height="202" fill="transparent" />
        <text x="44" y="44" fill="var(--ink)" fontSize="15" fontWeight="900">{labels.pathGraphTitle}</text>
        <text x="44" y="68" fill="var(--muted)" fontSize="12">
          {formatCompact(result.selectedWatt, 2)} W {"->"} {formatCompact(result.deliveredWatt, 2)} W
        </text>
        <rect x="44" y="96" width={railWidth} height="30" rx="15" fill="var(--field)" stroke="var(--line)" />
        <rect x="44" y="96" width={deliveredWidth} height="30" rx="15" fill="var(--green)" />
        <rect x={44 + deliveredWidth} y="96" width={lossWidth} height="30" rx="15" fill="var(--amber)" opacity="0.8" />
        <text x="44" y="154" fill="var(--muted)" fontSize="12">{labels.deliveredWatt}: {formatCompact(result.deliveredWatt, 2)} W</text>
        <text x="318" y="154" fill="var(--muted)" fontSize="12">{labels.pathLoss}: {formatCompact(result.pathTransmission * 100, 1)}%</text>
        <circle cx="686" cy="110" r="34" fill={statusColor} opacity="0.18" />
        <circle cx="686" cy="110" r="18" fill={statusColor} />
        <text x="686" y="154" fill="var(--ink)" fontSize="12" fontWeight="900" textAnchor="middle">{labels[result.beamStability]}</text>
      </svg>
    </div>
  );
}

export function FinishGraph({ values, result: baseResult, labels, unitSystem }: GraphProps) {
  const width = 800;
  const height = 300;
  const pad = { top: 24, right: 30, bottom: 50, left: 68 };
  const graphW = width - pad.left - pad.right;
  const graphH = height - pad.top - pad.bottom;
  const toDisplayLength = (mm: number) => (unitSystem === "imperial" ? mmToInches(mm) : mm);
  const yUnit = lengthUnit(unitSystem);
  const watts = Array.from({ length: 32 }, (_, index) => (baseResult.wattCeiling / 31) * index);
  const finishes = FINISHES as Record<string, { color: string }>;
  const variants: Array<{
    id: string;
    finishKey: string;
    label: string;
    color: string;
    cvdMaker: SpotInputs["cvdMaker"];
  }> = [
    { id: "PVD", finishKey: "PVD", label: "PVD", color: finishes.PVD.color, cvdMaker: "generic" },
    { id: "CVD", finishKey: "CVD", label: "CVD", color: finishes.CVD.color, cvdMaker: "generic" },
    { id: "CVD-IIVI", finishKey: "CVD", label: "CVD II-VI", color: "var(--violet)", cvdMaker: "iivi" },
    { id: "PRO", finishKey: "PRO", label: "PRO", color: finishes.PRO.color, cvdMaker: "generic" },
  ];
  const lines = variants.map((variant) => ({
    ...variant,
    points: watts.map((watt) => ({
      watt,
      spot: calculateSpot({ ...values, cvdMaker: variant.cvdMaker }, variant.finishKey, watt).spot,
    })),
  }));
  const allSpots = lines.flatMap((line) => line.points.map((point) => toDisplayLength(point.spot)));
  const minY = Math.min(...allSpots) * 0.985;
  const maxY = Math.max(...allSpots) * 1.025;
  const xScale = (watt: number) => pad.left + (watt / baseResult.wattCeiling) * graphW;
  const yScale = (spot: number) => pad.top + (1 - (spot - minY) / (maxY - minY || 1)) * graphH;
  const selectedX = xScale(baseResult.selectedWatt);

  return (
    <div className="graph-panel">
      <div className="graph-head">
        <div>
          <h2>{labels.graphFinishTitle}</h2>
          <p>{labels.graphFinishSub}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.graphFinishTitle}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const x = pad.left + ratio * graphW;
          return <line key={ratio} x1={x} x2={x} y1={pad.top} y2={pad.top + graphH} stroke="var(--grid)" />;
        })}
        {[0, 0.5, 1].map((ratio) => {
          const y = pad.top + ratio * graphH;
          const spot = maxY - (maxY - minY) * ratio;
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={pad.left + graphW} y1={y} y2={y} stroke="var(--grid)" />
              <text x={pad.left - 10} y={y + 4} fill="var(--axis)" fontSize="11" textAnchor="end">{formatNumber(spot, 4)}</text>
            </g>
          );
        })}
        {lines.map((line) => {
          const path = line.points.map((point, index) => `${index === 0 ? "M" : "L"}${xScale(point.watt)} ${yScale(toDisplayLength(point.spot))}`).join(" ");
          return <path key={line.id} d={path} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" />;
        })}
        <line x1={selectedX} x2={selectedX} y1={pad.top} y2={pad.top + graphH} stroke="var(--ink)" strokeDasharray="4 5" />
        {variants.map((variant) => {
          const finishResult = calculateSpot({ ...values, cvdMaker: variant.cvdMaker }, variant.finishKey);
          const y = yScale(toDisplayLength(finishResult.spot));
          return (
            <g key={`${variant.id}-dot`}>
              <circle cx={selectedX} cy={y} r="5.5" fill={variant.color} stroke="var(--panel-solid)" strokeWidth="2">
                <title>{variant.label}: {formatLength(finishResult.spot, unitSystem, 5)}</title>
              </circle>
            </g>
          );
        })}
        {variants.map((variant, index) => {
          const finishResult = calculateSpot({ ...values, cvdMaker: variant.cvdMaker }, variant.finishKey);
          return (
            <g key={variant.id} transform={`translate(${pad.left + index * 156} ${height - 28})`}>
              <circle cx="0" cy="0" r="5" fill={variant.color} />
              <text x="10" y="4" fill="var(--ink)" fontSize="12">{variant.label} {formatLength(finishResult.spot, unitSystem, 4)}</text>
            </g>
          );
        })}
        <text x={pad.left + graphW / 2} y={height - 4} fill="var(--ink)" fontSize="12" textAnchor="middle">W</text>
        <text x="17" y={pad.top + graphH / 2} fill="var(--ink)" fontSize="12" textAnchor="middle" transform={`rotate(-90 17 ${pad.top + graphH / 2})`}>{yUnit}</text>
      </svg>
    </div>
  );
}

export function FocalGraph({ values, labels, unitSystem }: GraphProps) {
  const width = 800;
  const height = 300;
  const pad = { top: 28, right: 34, bottom: 52, left: 70 };
  const graphW = width - pad.left - pad.right;
  const graphH = height - pad.top - pad.bottom;
  const toDisplayLength = (mm: number) => (unitSystem === "imperial" ? mmToInches(mm) : mm);
  const yUnit = lengthUnit(unitSystem);
  const palette = ["var(--primary)", "var(--green)", "var(--beam)", "var(--violet)", "var(--amber)", "#6f8fd9"];
  const focalPoints = FOCAL_LENGTHS.map((option) => ({
    focal: option.mm,
    label: formatOptionLength(option.mm, unitSystem),
  }));
  const series = LENS_DIAMETERS.map((diameter, index) => ({
    diameter: diameter.mm,
    label: formatOptionLength(diameter.mm, unitSystem),
    color: palette[index % palette.length],
    points: FOCAL_LENGTHS.map((option) => ({
      focal: option.mm,
      label: formatOptionLength(option.mm, unitSystem),
      spot: calculateSpot({ ...values, focalLength: option.mm, lensDiameter: diameter.mm }).spot,
    })),
  }));
  const allPoints = series.flatMap((item) => item.points);
  const maxSpot = Math.max(...allPoints.map((point) => toDisplayLength(point.spot))) * 1.12;
  const selectedFocal = Number(values.focalLength);
  const selectedLensDiameter = Number(values.lensDiameter);
  const yScale = (spot: number) => pad.top + (1 - spot / maxSpot) * graphH;
  const xScaleForFocal = (index: number) => pad.left + (index / Math.max(focalPoints.length - 1, 1)) * graphW;

  return (
    <div className="graph-panel">
      <div className="graph-head">
        <div>
          <h2>{labels.graphFocalTitle}</h2>
          <p>{labels.graphFocalSub}</p>
        </div>
      </div>
      <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.graphFocalTitle}>
        {[0, 0.5, 1].map((ratio) => {
          const y = pad.top + (1 - ratio) * graphH;
          const spot = maxSpot * ratio;
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={pad.left + graphW} y1={y} y2={y} stroke="var(--grid)" />
              <text x={pad.left - 10} y={y + 4} fill="var(--axis)" fontSize="11" textAnchor="end">{formatNumber(spot, 4)}</text>
            </g>
          );
        })}
        {series.map((item) => {
          const selectedSeries = Math.abs(item.diameter - selectedLensDiameter) < 0.02;
          const line = item.points.map((point, index) => `${index === 0 ? "M" : "L"}${xScaleForFocal(index)} ${yScale(toDisplayLength(point.spot))}`).join(" ");
          return (
            <path
              key={item.diameter}
              d={line}
              fill="none"
              stroke={item.color}
              strokeWidth={selectedSeries ? 3 : 1.8}
              strokeLinecap="round"
              opacity={selectedSeries ? 1 : 0.58}
            />
          );
        })}
        {series.map((item) => {
          const selectedSeries = Math.abs(item.diameter - selectedLensDiameter) < 0.02;
          return item.points.map((point, index) => {
            const selected = selectedSeries && Math.abs(point.focal - selectedFocal) < 0.02;
            return (
              <circle
                key={`${item.diameter}-${point.focal}`}
                cx={xScaleForFocal(index)}
                cy={yScale(toDisplayLength(point.spot))}
                r={selected ? 6 : selectedSeries ? 4 : 3}
                fill={selected ? "var(--beam)" : item.color}
                opacity={selectedSeries ? 1 : 0.58}
              >
                <title>{item.label} / {point.label}: {formatLength(point.spot, unitSystem, 5)}</title>
              </circle>
            );
          });
        })}
        {focalPoints.map((point, index) => {
          const selected = Math.abs(point.focal - selectedFocal) < 0.02;
          return (
            <g key={point.focal}>
              {index % 2 === 0 || selected ? (
                <text x={xScaleForFocal(index)} y={height - 30} fill="var(--axis)" fontSize="10" textAnchor="middle">{point.label}</text>
              ) : null}
            </g>
          );
        })}
        {series.map((item, index) => (
          <g key={`${item.diameter}-legend`} transform={`translate(${pad.left + index * 112} ${height - 16})`}>
            <circle cx="0" cy="0" r="4" fill={item.color} opacity={Math.abs(item.diameter - selectedLensDiameter) < 0.02 ? 1 : 0.58} />
            <text x="9" y="4" fill="var(--ink)" fontSize="10">{item.label}</text>
          </g>
        ))}
        <text x={pad.left + graphW / 2} y={height - 4} fill="var(--ink)" fontSize="12" textAnchor="middle">{labels.focalLength}</text>
        <text x="17" y={pad.top + graphH / 2} fill="var(--ink)" fontSize="12" textAnchor="middle" transform={`rotate(-90 17 ${pad.top + graphH / 2})`}>{yUnit}</text>
      </svg>
    </div>
  );
}

export function BeamLibraryGraph({ values, result, labels, unitSystem }: GraphProps) {
  const sortedSources = getFilteredSources(values.family)
    .slice()
    .sort((a, b) => a.ratedWatt - b.ratedWatt || a.beamMm - b.beamMm);
  const selectedSource = result.source;
  const nearbySources = sortedSources
    .filter((source) => source.id !== selectedSource.id)
    .sort((a, b) => Math.abs(a.ratedWatt - selectedSource.ratedWatt) - Math.abs(b.ratedWatt - selectedSource.ratedWatt))
    .slice(0, 8);
  const points = [selectedSource, ...nearbySources].sort((a, b) => a.ratedWatt - b.ratedWatt);
  const width = 800;
  const height = 360;
  const rail = { x: 210, y: 48, width: 510 };
  const bar = { left: 210, right: 78, top: 122, row: 27 };
  const barW = width - bar.left - bar.right;
  const maxWatt = Math.max(result.wattCeiling, result.source.ratedWatt, 1);
  const maxBeam = Math.max(...points.map((point) => point.beamMm), 1) * 1.18;
  const wattX = (watt: number) => rail.x + (watt / maxWatt) * rail.width;
  const beamWidth = (beam: number) => (beam / maxBeam) * barW;

  return (
    <div className="graph-panel">
      <div className="graph-head">
        <div>
          <h2>{labels.graphSourceTitle}</h2>
          <p>{labels.graphSourceSub}</p>
        </div>
      </div>
      <svg className="graph source-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={labels.graphSourceTitle}>
        <line x1={rail.x} x2={rail.x + rail.width} y1={rail.y} y2={rail.y} stroke="var(--axis)" strokeWidth="3" strokeLinecap="round" />
        {[result.source.ratedWatt, result.selectedWatt, result.peakWatt || 0].filter(Boolean).map((watt, index) => {
          const x = wattX(watt);
          return (
            <g key={`${watt}-${index}`}>
              <line x1={x} x2={x} y1={rail.y - 18} y2={rail.y + 18} stroke={index === 1 ? "var(--beam)" : "var(--primary)"} strokeWidth="3" />
              <text x={x} y={rail.y - 24} fill="var(--ink)" fontSize="11" textAnchor="middle">{formatCompact(watt, 1)} W</text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const y = bar.top + index * bar.row;
          const selected = point.id === values.sourceId;
          const fill = selected ? "var(--primary)" : point.excitation === "RF" ? "color-mix(in srgb, var(--primary) 62%, var(--panel-solid))" : "color-mix(in srgb, var(--beam) 62%, var(--panel-solid))";
          return (
            <g key={point.id}>
              <text x={bar.left - 12} y={y + 14} fill="var(--ink)" fontSize="12" fontWeight={selected ? 900 : 700} textAnchor="end">
                {point.brand} {point.model}
              </text>
              <rect x={bar.left} y={y} width={beamWidth(point.beamMm)} height="18" rx="9" fill={fill} />
              <text x={bar.left + beamWidth(point.beamMm) + 8} y={y + 14} fill="var(--muted)" fontSize="11">
                {formatLength(point.beamMm, unitSystem, 2)} / {point.ratedWatt} W
              </text>
            </g>
          );
        })}
        <text x={bar.left + barW / 2} y={height - 12} fill="var(--ink)" fontSize="12" textAnchor="middle">
          {labels.beamAxis.replace("(mm)", `(${lengthUnit(unitSystem)})`)}
        </text>
      </svg>
    </div>
  );
}

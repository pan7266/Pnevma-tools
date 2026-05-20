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
  onFocalLengthChange?: (focalLengthMm: number) => void;
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
  onFocalLengthChange,
  expanded = false,
}: Pick<GraphProps, "result" | "labels" | "unitSystem" | "onExpand" | "onFocalLengthChange" | "expanded">) {
  const centerY = 122;
  const startX = 46;
  const lensX = 286;
  const endX = 760;
  const focalOptions = FOCAL_LENGTHS.filter((option) => option.mm <= 228.6).map((option) => option.mm);
  const maxPresetFocal = Math.max(...focalOptions);
  const focalScale = (endX - lensX - 60) / maxPresetFocal;
  const focusX = clamp(lensX + result.focalLength * focalScale, lensX + 44, endX - 48);
  const pxPerMm = Math.min(150 / Math.max(result.lensDiameter, result.expandedBeam, result.sourceBeam, 1), 7.8);
  const incomingHalf = clamp((result.effectiveBeam * pxPerMm) / 2, 5, 58);
  const lensHalf = clamp((result.lensDiameter * pxPerMm) / 2, 28, 76);
  const beamAtLensHalf = clamp((result.effectiveBeam * pxPerMm) / 2, 4, Math.max(lensHalf - 5, 5));
  const alignmentOffset = clamp(result.alignmentLoss * lensHalf * 1.4, -14, 14);
  const incomingCenterY = centerY + alignmentOffset;
  const lensCenterY = centerY + alignmentOffset;
  const focusY = centerY + alignmentOffset * 0.78;
  const exitSlope = (focusY - lensCenterY) / Math.max(focusX - lensX, 1);
  const terminalCenterY = focusY + exitSlope * (endX - focusX) * 0.5;
  const spotHalf = clamp(result.spot * 360, 3.2, 10);
  const outputHalf = clamp(spotHalf + 6, 7, 18);
  const open = onExpand ? () => onExpand("beam") : undefined;
  const rayColor = result.clipped ? "var(--amber)" : "var(--beam)";
  const paraxialColor = "var(--primary)";
  const focalDots = result.focalLength > maxPresetFocal ? [...focalOptions, result.focalLength] : focalOptions;
  const focalLabelY = 236;
  const convexLens = result.shape.labelKey === "convex";
  const lensPath = convexLens
    ? `M${lensX} ${centerY - lensHalf} C${lensX - 5} ${centerY - lensHalf * 0.55} ${lensX - 5} ${centerY + lensHalf * 0.55} ${lensX} ${centerY + lensHalf} C${lensX + 5} ${centerY + lensHalf * 0.55} ${lensX + 5} ${centerY - lensHalf * 0.55} ${lensX} ${centerY - lensHalf} Z`
    : `M${lensX - 3} ${centerY - lensHalf} C${lensX - 8} ${centerY - lensHalf * 0.35} ${lensX - 8} ${centerY + lensHalf * 0.35} ${lensX - 3} ${centerY + lensHalf} C${lensX + 5} ${centerY + lensHalf * 0.35} ${lensX + 5} ${centerY - lensHalf * 0.35} ${lensX - 3} ${centerY - lensHalf} Z`;
  const focalButtonsEnabled = Boolean(onFocalLengthChange);

  return (
    <div
      className={`hero-rail clickable-graph-hero ${expanded ? "expanded" : ""}`}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open}
      onKeyDown={(event) => graphKeydown(event, open)}
    >
      <svg viewBox="0 0 800 260" role="img" aria-label={labels.beamPathTitle}>
        <rect width="800" height="260" fill="transparent" />
        <line x1={startX} x2={endX} y1={centerY} y2={centerY} stroke="var(--axis)" strokeDasharray="5 7" opacity="0.72" />

        <path d={`M${startX} ${incomingCenterY - incomingHalf} L${lensX} ${incomingCenterY - incomingHalf} L${focusX} ${focusY - spotHalf} L${endX} ${terminalCenterY - outputHalf}`} fill="none" stroke={rayColor} strokeWidth="1.45" strokeLinecap="round" />
        <path d={`M${startX} ${incomingCenterY + incomingHalf} L${lensX} ${incomingCenterY + incomingHalf} L${focusX} ${focusY + spotHalf} L${endX} ${terminalCenterY + outputHalf}`} fill="none" stroke={rayColor} strokeWidth="1.45" strokeLinecap="round" />
        <path d={`M${startX} ${incomingCenterY} L${lensX} ${lensCenterY} L${focusX} ${focusY} L${endX} ${terminalCenterY}`} fill="none" stroke={paraxialColor} strokeWidth="1.1" strokeLinecap="round" opacity="0.72" />

        <path d={lensPath} fill="color-mix(in srgb, var(--primary) 34%, var(--panel-solid))" stroke="var(--primary)" strokeWidth="1.6" opacity="0.94" />
        <line x1={lensX} x2={lensX} y1={centerY - lensHalf - 12} y2={centerY + lensHalf + 12} stroke="var(--line)" strokeWidth="0.8" />

        <line x1={focusX} x2={focusX} y1={centerY - 40} y2={centerY + 40} stroke="var(--beam)" strokeWidth="1.4" strokeDasharray="4 5" />
        <circle cx={focusX} cy={focusY} r={Math.max(spotHalf, 3.6)} fill="var(--beam)" opacity="0.92" />
        <line x1={focusX - 14} x2={focusX + 14} y1={focusY} y2={focusY} stroke="var(--ink)" strokeWidth="0.9" opacity="0.5" />
        <line x1={focusX} x2={focusX} y1={focusY - 14} y2={focusY + 14} stroke="var(--ink)" strokeWidth="0.9" opacity="0.5" />

        <text x={startX} y="32" fill="var(--muted)" fontSize="12">{labels.sourceBeam}: {formatLength(result.sourceBeam, unitSystem, 2)}</text>
        <text x={startX} y="48" fill="var(--muted)" fontSize="10.5">{labels.effectiveBeam}: {formatLength(result.effectiveBeam, unitSystem, 2)}</text>
        <text x={lensX} y={Math.min(centerY + lensHalf + 28, 232)} fill="var(--muted)" fontSize="12" textAnchor="middle">{labels.lens}: {formatLength(result.lensDiameter, unitSystem, 2)}</text>
        <text x={focusX} y={Math.max(focusY - 42, 36)} fill="var(--ink)" fontSize="13" fontWeight="900" textAnchor="middle">
          {labels.spotDiameter}: {formatLength(result.spot, unitSystem, 4)}
        </text>
        <text x={focusX} y={Math.min(focusY + 58, 236)} fill="var(--muted)" fontSize="11" textAnchor="middle">
          {labels.focalLength}: {formatLength(result.focalLength, unitSystem, 2)}
        </text>
        <text x={endX} y="32" fill="var(--muted)" fontSize="12" textAnchor="end">
          {labels.effectiveBeam}: {formatLength(result.effectiveBeam, unitSystem, 2)}
        </text>
        {result.alignmentLoss > 0 ? (
          <text x={lensX} y={Math.max(centerY - lensHalf - 20, 30)} fill="var(--amber)" fontSize="11" textAnchor="middle">
            {labels.alignmentImpact}: {formatCompact(result.alignmentLoss * 100, 1)}%
          </text>
        ) : null}
        <text x={endX} y="48" fill="var(--muted)" fontSize="10.5" textAnchor="end">
          {labels.opticalTaper}: {labels[result.beamStability]}
        </text>
        <line x1={lensX} x2={endX - 20} y1={focalLabelY} y2={focalLabelY} stroke="var(--grid)" />
        {focalDots.map((focal) => {
          const x = clamp(lensX + focal * focalScale, lensX + 8, endX - 18);
          const selected = Math.abs(focal - result.focalLength) < 0.02;
          return (
            <g
              key={focal}
              className="focal-dot-button"
              role={focalButtonsEnabled ? "button" : undefined}
              tabIndex={focalButtonsEnabled ? 0 : undefined}
              aria-label={`${labels.focalLength}: ${formatLength(focal, unitSystem, 2)}`}
              onClick={(event) => {
                event.stopPropagation();
                onFocalLengthChange?.(focal);
              }}
              onKeyDown={(event) => {
                if (!onFocalLengthChange || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                event.stopPropagation();
                onFocalLengthChange(focal);
              }}
            >
              <rect x={x - 14} y={focalLabelY - 14} width="28" height="28" rx="14" fill="transparent" stroke={selected ? "var(--beam)" : "var(--line)"} strokeWidth={selected ? "1.2" : "0.8"} opacity={selected ? 0.8 : 0.38} />
              <circle cx={x} cy={focalLabelY} r={selected ? 5 : 3.2} fill={selected ? "var(--beam)" : "var(--primary)"} opacity={selected ? 1 : 0.72}>
                <title>{labels.focalLength}: {formatLength(focal, unitSystem, 2)}</title>
              </circle>
              {selected || expanded ? <text x={x} y={focalLabelY - 9} fill="var(--muted)" fontSize="9" textAnchor="middle">{formatLength(focal, unitSystem, 1)}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );

}

export function PulseHzGraph({
  hz,
  selectedWatt,
  pulseEnergyMj,
  spotTemperatureC,
  labels,
  expanded = false,
  onHzChange,
  onExpand,
}: {
  hz: number;
  selectedWatt: number;
  pulseEnergyMj: number;
  spotTemperatureC?: number;
  labels: Record<string, string>;
  expanded?: boolean;
  onHzChange: (hz: number) => void;
  onExpand?: () => void;
}) {
  const minHz = 1000;
  const maxHz = 100000;
  const width = 520;
  const height = expanded ? 300 : 160;
  const axisLeft = 42;
  const axisRight = width - 24;
  const axisW = axisRight - axisLeft;
  const timeWindowMs = expanded ? 0.5 : 0.25;
  const cycles = clamp(hz * (timeWindowMs / 1000), expanded ? 1.5 : 1, expanded ? 48 : 22);
  const path = Array.from({ length: 220 }, (_, index) => {
    const ratio = index / 219;
    const x = axisLeft + ratio * axisW;
    const y = height / 2 + Math.sin(ratio * cycles * Math.PI * 2) * (expanded ? 62 : 30);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  function pickHz(clientX: number, currentTarget: SVGSVGElement) {
    const rect = currentTarget.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left - axisLeft * (rect.width / width)) / (axisW * (rect.width / width)), 0, 1);
    onHzChange(Math.round((minHz + ratio * (maxHz - minHz)) / 100) * 100);
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
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={expanded ? 1.35 : 1.1} />
        <text x={axisLeft} y="18" fill="var(--muted)" fontSize="10">
          {labels.pulseSelectedHz}: {formatCompact(hz, 0)} Hz · {formatCompact(timeWindowMs, 2)} ms
        </text>
        <text x={axisLeft} y={height - 8} fill="var(--muted)" fontSize="11">{formatCompact(minHz, 0)} Hz</text>
        <text x={axisRight} y={height - 8} fill="var(--muted)" fontSize="11" textAnchor="end">{formatCompact(maxHz, 0)} Hz</text>
      </svg>
      <div className="preview-metrics">
        <span>{labels.pulseEnergyPerPulse}: <strong>{formatNumber(pulseEnergyMj, 3)} mJ</strong></span>
        <span>{labels.selectedWatt}: <strong>{formatCompact(selectedWatt, 2)} W</strong></span>
        {spotTemperatureC ? <span>{labels.estimatedSpotTemperature}: <strong>{formatCompact(spotTemperatureC, 0)} °C</strong></span> : null}
      </div>
      {expanded ? (
        <div className="graph-slider-row pulse-hz-slider">
          <span>{labels.hzZoomSlider}</span>
          <input
            type="range"
            min={minHz}
            max={maxHz}
            step="100"
            value={clamp(hz, minHz, maxHz)}
            aria-label={labels.hzZoomSlider}
            onChange={(event) => onHzChange(Number(event.target.value))}
          />
          <strong>{formatCompact(hz, 0)} Hz</strong>
        </div>
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

export function MirrorFinishPreview({
  finishKey,
  label,
  reflectivity,
  diameterMm,
  unitSystem,
  labels,
}: {
  finishKey: string;
  label: string;
  reflectivity: number;
  diameterMm: number;
  unitSystem: UnitSystem;
  labels: Record<string, string>;
}) {
  const palette: Record<string, { core: string; edge: string; shine: string }> = {
    enhancedCopper: { core: "#b96830", edge: "#5f2f1f", shine: "#ffd09a" },
    protectedGold: { core: "#d4a21f", edge: "#76530d", shine: "#fff0a5" },
    molybdenum: { core: "#9aa1a9", edge: "#3f4650", shine: "#eef2f6" },
    standardSi: { core: "#7f91b8", edge: "#394764", shine: "#dce8ff" },
  };
  const colors = palette[finishKey] || palette.standardSi;
  const gradientId = `mirror-disk-${finishKey.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <div className="technical-preview optic-preview" aria-label={labels.mirrorPreviewTitle}>
      <div className="preview-head"><span>{labels.mirrorPreviewTitle}</span><strong>{formatCompact(reflectivity * 100, 2)}%</strong></div>
      <svg viewBox="0 0 220 130" role="img">
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="30%" r="62%">
            <stop offset="0" stopColor={colors.shine} />
            <stop offset="0.42" stopColor={colors.core} />
            <stop offset="1" stopColor={colors.edge} />
          </radialGradient>
        </defs>
        <rect width="220" height="130" fill="transparent" />
        <g transform="translate(0 2)">
          <circle cx="110" cy="56" r="40" fill={`url(#${gradientId})`} stroke="var(--line)" strokeWidth="3" />
          <circle cx="110" cy="56" r="29" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.4" />
          <ellipse cx="94" cy="40" rx="20" ry="8" fill="rgba(255,255,255,.42)" transform="rotate(-18 94 40)" />
        </g>
        <path d="M28 58 H70 M150 58 H194" fill="none" stroke="var(--beam)" strokeWidth="2" strokeLinecap="round" />
        <text x="110" y="112" fill="var(--muted)" fontSize="10.5" textAnchor="middle">{label}</text>
        <text x="110" y="126" fill="var(--ink)" fontSize="10.5" fontWeight="900" textAnchor="middle">
          {formatLength(diameterMm, unitSystem, 2)}
        </text>
      </svg>
    </div>
  );
}

export function ExpanderGraph({ result, labels, unitSystem, onExpand }: Pick<GraphProps, "result" | "labels" | "unitSystem" | "onExpand">) {
  const open = onExpand ? () => onExpand("expander") : undefined;
  const pxPerMm = Math.min(118 / Math.max(result.sourceBeam, result.expandedBeam, 1), 11);
  const inHalf = clamp((result.sourceBeam * pxPerMm) / 2, 5, 54);
  const outHalf = clamp((result.expandedBeam * pxPerMm) / 2, 5, 66);
  return (
    <div className="technical-preview expander-preview clickable-graph-hero" role={open ? "button" : undefined} tabIndex={open ? 0 : undefined} onClick={open} onKeyDown={(event) => graphKeydown(event, open)}>
      <div className="preview-head"><span>{labels.expanderGraphTitle}</span><strong>{formatCompact(result.expanderMultiplier, 2)}x</strong></div>
      <svg viewBox="0 0 520 170" role="img" aria-label={labels.expanderGraphTitle}>
        <rect width="520" height="170" fill="transparent" />
        <path d={`M32 ${85 - inHalf} L178 ${85 - inHalf} L332 ${85 - outHalf} L488 ${85 - outHalf}`} fill="none" stroke="var(--beam)" strokeWidth="1.7" />
        <path d={`M32 ${85 + inHalf} L178 ${85 + inHalf} L332 ${85 + outHalf} L488 ${85 + outHalf}`} fill="none" stroke="var(--beam)" strokeWidth="1.7" />
        <line x1="32" x2="488" y1="85" y2="85" stroke="var(--axis)" strokeDasharray="5 7" />
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
  function pointFor(stageId: string) {
    if (stageId === "source") return { x: 790, y: 84 };
    if (stageId === "combiner") {
      if (result.beamCombinerPosition === "nearSource") return { x: 660, y: 84 };
      if (result.beamCombinerPosition === "beforeFirstMirror") return { x: 380, y: 84 };
      return { x: 184, y: 126 };
    }
    if (stageId === "mirror-1") return { x: 118, y: 84 };
    if (stageId === "mirror-2") return { x: 118, y: 282 };
    if (stageId === "mirror-3") return { x: 646, y: 282 };
    if (stageId === "lens") return { x: 646, y: 392 };
    if (stageId === "surface") return { x: 646, y: 492 };
    return { x: 646, y: 282 };
  }
  function labelFor(stageId: string, x: number, y: number) {
    if (stageId === "source") return { x: x - 4, y: y - 34, anchor: "end" as const };
    if (stageId === "combiner" && result.beamCombinerPosition === "firstMirror") return { x: x + 36, y: y + 34, anchor: "start" as const };
    if (stageId === "combiner") return { x, y: y - 30, anchor: "middle" as const };
    if (stageId === "mirror-1") return { x, y: y - 38, anchor: "middle" as const };
    if (stageId === "mirror-2") return { x, y: y + 48, anchor: "middle" as const };
    if (stageId === "mirror-3") return { x: x + 54, y: y - 30, anchor: "start" as const };
    if (stageId === "lens") return { x: x + 54, y: y + 2, anchor: "start" as const };
    if (stageId === "surface") return { x: x + 54, y: y + 2, anchor: "start" as const };
    return { x, y: y + 44, anchor: "middle" as const };
  }
  const points = result.opticalStages.map((stage) => ({ stage, ...pointFor(stage.id) }));
  const beamStroke = (beamMm: number) => clamp(beamMm * 0.6, 2.2, 11.5);
  return (
    <div className={`graph-panel optical-path-panel ${expanded ? "expanded" : ""}`}>
      <div className="graph-head">
        <div>
          <h2>{labels.fullOpticalPathTitle}</h2>
          <p>{labels.assumptionsTitle}</p>
        </div>
      </div>
      <svg className="graph optical-path-graph" viewBox="0 0 900 540" role="img" aria-label={labels.fullOpticalPathTitle} onClick={open}>
        <rect width="900" height="540" fill="transparent" />
        {result.expanderMultiplier > 1 ? (
          <g opacity="0.9">
            <rect x="500" y="58" width="68" height="52" rx="10" fill="color-mix(in srgb, var(--green) 14%, var(--panel-solid))" stroke="var(--green)" />
            <path d="M514 72h40M514 96h40" stroke="var(--green)" strokeWidth="1.4" />
            <text x="534" y="128" fill="var(--muted)" fontSize="9.5" textAnchor="middle">{result.expanderMultiplier}x</text>
          </g>
        ) : null}
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          return (
            <line
              key={`${point.stage.id}-${next.stage.id}`}
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
              stroke="var(--beam)"
              strokeWidth={beamStroke(point.stage.beamMm)}
              strokeLinecap="round"
              opacity="0.82"
            />
          );
        })}
        {points.map(({ stage, x, y }) => {
          const label = labelFor(stage.id, x, y);
          return (
          <g key={stage.id} role="button" tabIndex={0} onClick={(event) => {
            event.stopPropagation();
            setSelectedId(stage.id);
          }} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setSelectedId(stage.id);
          }}>
            {stage.kind === "mirror" ? (
              <circle cx={x} cy={y} r={stage.warning ? 10 : 8} fill={stage.warning ? "var(--amber)" : "var(--panel-solid)"} stroke="var(--primary)" strokeWidth="2.2" />
            ) : (
              <circle cx={x} cy={y} r={selectedId === stage.id ? 18 : 14} fill={stage.warning ? "var(--amber)" : stage.kind === "surface" ? "var(--green)" : "var(--panel-solid)"} stroke={stage.kind === "source" ? "var(--beam)" : "var(--primary)"} strokeWidth="2.6" />
            )}
            <circle cx={x} cy={y} r={stage.kind === "mirror" ? 15 : 1} fill="transparent">
              <title>{labels[stage.labelKey]} · {labels.energyAfterStage}: {formatCompact(stage.energyWatt, 2)} W</title>
            </circle>
            <text x={label.x} y={label.y} fill="var(--ink)" fontSize="10.5" fontWeight="900" textAnchor={label.anchor}>{labels[stage.labelKey]}</text>
            <text x={label.x} y={label.y + 15} fill="var(--muted)" fontSize="9.5" textAnchor={label.anchor}>
              {formatCompact(stage.energyPercent, 1)}% · {formatLength(stage.beamMm, unitSystem, stage.kind === "surface" ? 4 : 2)}
            </text>
          </g>
          );
        })}
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

export function FocalGraph({ values, labels, unitSystem, expanded = false }: GraphProps) {
  const [zoom, setZoom] = useState(1);
  const width = 800;
  const height = expanded ? 390 : 330;
  const pad = { top: 36, right: 40, bottom: 76, left: 74 };
  const graphW = width - pad.left - pad.right;
  const graphH = height - pad.top - pad.bottom;
  const toDisplayLength = (mm: number) => (unitSystem === "imperial" ? mmToInches(mm) : mm);
  const yUnit = lengthUnit(unitSystem);
  const palette = ["var(--primary)", "var(--green)", "var(--beam)"];
  const presetFocals = FOCAL_LENGTHS.filter((option) => option.mm <= 228.6);
  const sourceFocals = Number(values.focalLength) > 228.6
    ? [...presetFocals, { mm: Number(values.focalLength) }]
    : presetFocals;
  const focalPoints = sourceFocals.map((option) => ({
    focal: option.mm,
    label: formatOptionLength(option.mm, unitSystem),
  }));
  const selectedLensDiameter = Number(values.lensDiameter);
  const nearestLensDiameters = LENS_DIAMETERS
    .slice()
    .sort((a, b) => Math.abs(a.mm - selectedLensDiameter) - Math.abs(b.mm - selectedLensDiameter))
    .slice(0, expanded ? 3 : 1)
    .sort((a, b) => a.mm - b.mm);
  const series = nearestLensDiameters.map((diameter, index) => ({
    diameter: diameter.mm,
    label: formatOptionLength(diameter.mm, unitSystem),
    color: palette[index % palette.length],
    points: sourceFocals.map((option) => ({
      focal: option.mm,
      label: formatOptionLength(option.mm, unitSystem),
      spot: calculateSpot({ ...values, focalLength: option.mm, lensDiameter: diameter.mm }).spot,
    })),
  }));
  const allPoints = series.flatMap((item) => item.points);
  const maxSpot = Math.max(...allPoints.map((point) => toDisplayLength(point.spot))) * 1.12;
  const zoomedMaxSpot = maxSpot / zoom;
  const selectedFocal = Number(values.focalLength);
  const yScale = (spot: number) => pad.top + (1 - clamp(spot / zoomedMaxSpot, 0, 1)) * graphH;
  const xScaleForFocal = (index: number) => pad.left + (index / Math.max(focalPoints.length - 1, 1)) * graphW;

  return (
    <div className="graph-panel">
      <div className="graph-head">
        <div>
          <h2>{labels.graphFocalTitle}</h2>
          <p>{labels.graphFocalSub}</p>
        </div>
      </div>
      <svg
        className="graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={labels.graphFocalTitle}
        onWheel={expanded ? (event) => {
          event.preventDefault();
          setZoom((current) => clamp(current + (event.deltaY < 0 ? 0.18 : -0.18), 0.75, 3.4));
        } : undefined}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = pad.top + (1 - ratio) * graphH;
          const spot = zoomedMaxSpot * ratio;
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
        {series.map((item, seriesIndex) => {
          const selectedSeries = Math.abs(item.diameter - selectedLensDiameter) < 0.02;
          return item.points.map((point, index) => {
            const selected = selectedSeries && Math.abs(point.focal - selectedFocal) < 0.02;
            const x = xScaleForFocal(index);
            const y = yScale(toDisplayLength(point.spot));
            const showValue = selected || (selectedSeries && (expanded ? index % 2 === 0 : index === 0 || index === item.points.length - 1));
            const labelX = expanded
              ? clamp(x + (seriesIndex - (series.length - 1) / 2) * 6, pad.left + 8, pad.left + graphW - 8)
              : x;
            const labelY = expanded
              ? seriesIndex % 2 === 0
                ? Math.max(pad.top + 9, y - 10 - Math.floor(seriesIndex / 2) * 10)
                : Math.min(pad.top + graphH - 4, y + 16 + Math.floor(seriesIndex / 2) * 10)
              : Math.max(pad.top + 8, y - 9);
            return (
              <g key={`${item.diameter}-${point.focal}`} opacity={selectedSeries ? 1 : 0.64}>
                <circle
                  cx={x}
                  cy={y}
                  r={selected ? 6 : selectedSeries ? 4 : 3}
                  fill={selected ? "var(--beam)" : item.color}
                >
                  <title>{item.label} / {point.label}: {formatLength(point.spot, unitSystem, 5)}</title>
                </circle>
                {showValue ? (
                  <text x={labelX} y={Math.max(pad.top + 8, labelY - 4)} fill={selected ? "var(--ink)" : item.color} fontSize={expanded ? "5.4" : "6"} fontWeight={selected ? 800 : 600} textAnchor="middle">
                    {formatNumber(toDisplayLength(point.spot), 4)}
                  </text>
                ) : null}
              </g>
            );
          });
        })}
        {focalPoints.map((point, index) => {
          const selected = Math.abs(point.focal - selectedFocal) < 0.02;
          return (
            <g key={point.focal}>
              {index % 2 === 0 || selected ? (
                <text x={xScaleForFocal(index)} y={height - 48} fill="var(--axis)" fontSize="10" textAnchor="middle">{point.label}</text>
              ) : null}
            </g>
          );
        })}
        {series.map((item, index) => (
          <g key={`${item.diameter}-legend`} transform={`translate(${pad.left + index * 112} ${height - 24})`}>
            <circle cx="0" cy="0" r="4" fill={item.color} opacity={Math.abs(item.diameter - selectedLensDiameter) < 0.02 ? 1 : 0.58} />
            <text x="9" y="4" fill="var(--ink)" fontSize="10">{item.label}</text>
          </g>
        ))}
        <text x={pad.left + graphW / 2} y={height - 8} fill="var(--ink)" fontSize="12" textAnchor="middle">{labels.focalLength}</text>
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

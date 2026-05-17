"use client";

import { formatCompact, formatLength } from "@/lib/units/convert";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { AxisIntervalResult, AxisResult, UnitSystem } from "@/types";

function graphKeydown(event: KeyboardEvent<HTMLDivElement>, action?: () => void) {
  if (!action) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function AxisIntervalGraph({
  result,
  labels,
  unitSystem,
  expanded = false,
  onExpand,
}: {
  result: AxisResult;
  labels: Record<string, string>;
  unitSystem: UnitSystem;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const graph = result.graphData;
  const interval = result.interval;
  if (!graph || !interval) return null;

  return (
    <div
      className={`result-hero clickable-graph-hero ${expanded ? "expanded" : ""}`}
      role={onExpand ? "button" : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onClick={onExpand}
      onKeyDown={(event) => graphKeydown(event, onExpand)}
    >
      <svg viewBox="0 0 820 220" role="img" aria-label={labels.intervalGraphTitle}>
        <rect width="820" height="220" fill="transparent" />
        <text x="32" y="36" fill="var(--ink)" fontSize="15" fontWeight="900">
          {interval.clean ? labels.cleanHeadline : labels.notCleanHeadline}
        </text>
        <text x="32" y="60" fill="var(--muted)" fontSize="12">
          {formatLength(result.calc.mmPerMicrostep, unitSystem, 6)} · {labels.mmPerMicrostep}
        </text>
        <line x1="64" x2="756" y1="116" y2="116" stroke="var(--axis)" strokeWidth="4" />
        <g>
          {graph.ticks.map((x) => (
            <line key={x} x1={x} x2={x} y1="104" y2="128" stroke="var(--axis)" strokeWidth="2" />
          ))}
        </g>
        <line x1={graph.requestedX} x2={graph.requestedX} y1="76" y2="156" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
        <line x1={graph.nearestX} x2={graph.nearestX} y1="84" y2="148" stroke="var(--amber)" strokeWidth="3" strokeDasharray="5 5" />
        <text x={graph.requestedX} y="180" fill="var(--ink)" fontSize="12" textAnchor="middle">
          {formatCompact(interval.intervalMicrosteps, 2)} {labels.microsteps}
        </text>
        <text x={graph.nearestX} y="199" fill="var(--amber)" fontSize="12" textAnchor="middle">
          {interval.nearestMicrosteps} {labels.clean}
        </text>
      </svg>
    </div>
  );
}

export function EngravingLineGraph({
  result,
  labels,
  unitSystem,
  expanded = false,
  onExpand,
}: {
  result: AxisResult;
  labels: Record<string, string>;
  unitSystem: UnitSystem;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const graph = result.graphData;
  const interval = result.interval;
  const [selected, setSelected] = useState<"requested" | "nearest" | "dpi">("nearest");
  if (!graph || !interval || !result.requestedLineInterval) return <p className="data-note">{labels.noIntervalResult}</p>;

  const currentDpiInterval = result.requestedDpi ? 25.4 / result.requestedDpi : result.requestedLineInterval;
  const mismatch = Math.abs(interval.errorMm) > 0.000001;
  const lines = [
    {
      id: "requested" as const,
      x: graph.requestedX,
      color: "var(--primary)",
      label: labels.userSelectedInterval,
      value: result.requestedLineInterval,
      dash: "",
    },
    {
      id: "nearest" as const,
      x: graph.nearestX,
      color: "var(--green)",
      label: labels.nearestMechanicalInterval,
      value: interval.nearestCleanInterval,
      dash: "",
    },
    {
      id: "dpi" as const,
      x: graph.currentDpiX,
      color: "var(--ink)",
      label: labels.currentDpiLine,
      value: currentDpiInterval,
      dash: mismatch ? "4 5" : "2 7",
    },
  ];
  const selectedLine = lines.find((line) => line.id === selected) || lines[1];

  return (
    <div
      className={`graph-panel engraving-line-panel clickable-graph-hero ${expanded ? "expanded" : ""}`}
      role={onExpand ? "button" : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onClick={onExpand}
      onKeyDown={(event) => graphKeydown(event, onExpand)}
    >
      <div className="graph-head">
        <div>
          <h2>{labels.engravingLineGraphTitle}</h2>
          <p>{labels.clickLineHint}</p>
        </div>
      </div>
      <svg className="graph engraving-line-graph" viewBox="0 0 820 300" role="img" aria-label={labels.engravingLineGraphTitle}>
        <rect width="820" height="300" fill="transparent" />
        {Array.from({ length: 11 }, (_, index) => {
          const y = 48 + index * 20;
          return (
            <line key={index} x1="64" x2="756" y1={y} y2={y} stroke={index % 2 ? "var(--grid)" : "var(--beam)"} strokeWidth={index % 2 ? 1 : 1.5} opacity={index % 2 ? 0.8 : 0.78} />
          );
        })}
        <line x1="64" x2="756" y1="252" y2="252" stroke="var(--axis)" strokeWidth="2" />
        {lines.map((line) => (
          <g key={line.id} role="button" tabIndex={0} onClick={(event) => {
            event.stopPropagation();
            setSelected(line.id);
          }} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setSelected(line.id);
          }}>
            <line x1={line.x} x2={line.x} y1="34" y2="258" stroke={line.color} strokeWidth={selected === line.id ? 5 : 3} strokeDasharray={line.dash} strokeLinecap="round">
              <title>{line.label}: {formatLength(line.value, unitSystem, 4)}</title>
            </line>
            <circle cx={line.x} cy="252" r={selected === line.id ? 7 : 5} fill={line.color} stroke="var(--panel-solid)" strokeWidth="2" />
            <text x={line.x} y={line.id === "nearest" ? 286 : 274} fill={line.color} fontSize="11" fontWeight="900" textAnchor="middle">
              {line.id === "dpi" && !mismatch ? "" : line.label}
            </text>
          </g>
        ))}
        {mismatch ? (
          <g>
            <path d={`M${graph.requestedX} 78 C${(graph.requestedX + graph.nearestX) / 2} 54 ${(graph.requestedX + graph.nearestX) / 2} 54 ${graph.nearestX} 78`} fill="none" stroke="var(--amber)" strokeWidth="2" strokeDasharray="5 5" />
            <text x={(graph.requestedX + graph.nearestX) / 2} y="50" fill="var(--amber)" fontSize="12" fontWeight="900" textAnchor="middle">
              {labels.deviation}: {formatLength(Math.abs(interval.errorMm), unitSystem, 4)} / {formatCompact(Math.abs(interval.errorPercent), 3)}%
            </text>
          </g>
        ) : null}
      </svg>
      <div className={`line-detail ${mismatch ? "warn" : "ok"}`}>
        <strong>{selectedLine.label}: {formatLength(selectedLine.value, unitSystem, 4)}</strong>
        <span>{labels.nearestMechanicalInterval}: {formatLength(interval.nearestCleanInterval, unitSystem, 4)} · {labels.deviation}: {formatLength(Math.abs(interval.errorMm), unitSystem, 4)} · {labels.deviationPercent}: {formatCompact(Math.abs(interval.errorPercent), 3)}%</span>
        <p>{mismatch ? labels.whyNearestBetter : labels.cleanExplanation}</p>
      </div>
    </div>
  );
}

export function AxisMiniSummary({ interval, unitSystem = "metric" }: { interval: AxisIntervalResult | null; unitSystem?: UnitSystem }) {
  if (!interval) return null;
  return (
    <span>
      {formatLength(interval.nearestCleanInterval, unitSystem, 6)} | {formatCompact(interval.nearestCleanDpi, 1)} DPI
    </span>
  );
}

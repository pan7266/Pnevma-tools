"use client";

import { formatCompact, formatLength } from "@/lib/units/convert";
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
          {formatLength(result.calc.mmPerMicrostep, unitSystem, 6)} / microstep
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
          {formatCompact(interval.intervalMicrosteps, 2)} steps
        </text>
        <text x={graph.nearestX} y="199" fill="var(--amber)" fontSize="12" textAnchor="middle">
          {interval.nearestMicrosteps} clean
        </text>
      </svg>
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

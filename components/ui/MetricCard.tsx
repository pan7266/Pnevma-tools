"use client";

import { InfoButton } from "@/components/ui/InfoButton";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  detail?: string;
  detailTitle?: string;
  onInfoOpen?: (modal: { title: string; body: string }) => void;
  tone?: string;
}

export function MetricCard({ label, value, sub, detail, detailTitle, onInfoOpen, tone = "" }: MetricCardProps) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-label-row">
        <span>{label}</span>
        {detail && onInfoOpen ? <InfoButton title={detailTitle || label} body={detail} onOpen={onInfoOpen} /> : null}
      </div>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

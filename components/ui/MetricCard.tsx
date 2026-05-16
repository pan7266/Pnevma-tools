interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}

export function MetricCard({ label, value, sub, tone = "" }: MetricCardProps) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

"use client";

interface CollapsibleSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
}

export function CollapsibleSection({ title, action, children, open = true }: CollapsibleSectionProps) {
  return (
    <details className="control-section" open={open}>
      <summary>
        <span>{title}</span>
        {action ? <span className="summary-action">{action}</span> : null}
      </summary>
      <div className="field-group">{children}</div>
    </details>
  );
}

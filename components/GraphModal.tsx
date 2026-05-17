"use client";

import { useEffect } from "react";

interface GraphModalProps {
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function GraphModal({ title, closeLabel, children, onClose }: GraphModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal graph-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="button secondary modal-close" type="button" onClick={onClose} aria-label={closeLabel}>
            x
          </button>
        </div>
        <div className="graph-modal-body">{children}</div>
      </div>
    </div>
  );
}

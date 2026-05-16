"use client";

import { useAppSettings } from "@/components/AppSettings";

export function UnitToggle() {
  const { unitSystem, setUnitSystem } = useAppSettings();
  return (
    <div className="segmented" aria-label="Units">
      <button
        className={unitSystem === "metric" ? "active" : ""}
        type="button"
        onClick={() => setUnitSystem("metric")}
      >
        Metric
      </button>
      <button
        className={unitSystem === "imperial" ? "active" : ""}
        type="button"
        onClick={() => setUnitSystem("imperial")}
      >
        Imperial
      </button>
    </div>
  );
}

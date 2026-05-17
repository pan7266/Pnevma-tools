"use client";

import { useAppSettings } from "@/components/AppSettings";
import { getLocale } from "@/locales";

export function UnitToggle() {
  const { lang, unitSystem, setUnitSystem } = useAppSettings();
  const labels = getLocale(lang).common;
  return (
    <div className="segmented" aria-label={labels.units}>
      <button
        className={unitSystem === "metric" ? "active" : ""}
        type="button"
        onClick={() => setUnitSystem("metric")}
      >
        {labels.metric}
      </button>
      <button
        className={unitSystem === "imperial" ? "active" : ""}
        type="button"
        onClick={() => setUnitSystem("imperial")}
      >
        {labels.imperial}
      </button>
    </div>
  );
}

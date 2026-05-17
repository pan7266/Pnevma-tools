"use client";

import { useAppSettings } from "@/components/AppSettings";
import { LANGUAGE_OPTIONS } from "@/lib/data/options";
import { getLocale } from "@/locales";
import type { Lang } from "@/types";

export function LanguageToggle() {
  const { lang, setLang } = useAppSettings();
  const labels = getLocale(lang).common;
  return (
    <select className="language-select" aria-label={labels.language} value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
      {LANGUAGE_OPTIONS.map((option) => (
        <option key={option.code} value={option.code}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

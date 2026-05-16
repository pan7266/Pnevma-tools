"use client";

import { useAppSettings } from "@/components/AppSettings";
import { LANGUAGE_OPTIONS } from "@/lib/data/options";
import type { Lang } from "@/types";

export function LanguageToggle() {
  const { lang, setLang } = useAppSettings();
  return (
    <select className="language-select" aria-label="Language" value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
      {LANGUAGE_OPTIONS.map((option) => (
        <option key={option.code} value={option.code}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

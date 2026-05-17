"use client";

import { useAppSettings } from "@/components/AppSettings";
import { getLocale } from "@/locales";

export function ThemeToggle() {
  const { lang, theme, setTheme } = useAppSettings();
  const labels = getLocale(lang).common;
  return (
    <div className="segmented" aria-label={labels.theme}>
      <button className={theme === "light" ? "active" : ""} type="button" onClick={() => setTheme("light")}>
        {labels.light}
      </button>
      <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => setTheme("dark")}>
        {labels.dark}
      </button>
    </div>
  );
}

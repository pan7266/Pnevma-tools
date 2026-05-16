"use client";

import { useAppSettings } from "@/components/AppSettings";

export function ThemeToggle() {
  const { theme, setTheme } = useAppSettings();
  return (
    <div className="segmented" aria-label="Theme">
      <button className={theme === "light" ? "active" : ""} type="button" onClick={() => setTheme("light")}>
        Light
      </button>
      <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => setTheme("dark")}>
        Dark
      </button>
    </div>
  );
}

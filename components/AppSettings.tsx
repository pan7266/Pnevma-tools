"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Lang, Theme, UnitSystem } from "@/types";

interface AppSettings {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (unitSystem: UnitSystem) => void;
}

const AppSettingsContext = createContext<AppSettings | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.unitSystem = unitSystem;
  }, [unitSystem]);

  const value = useMemo(
    () => ({ lang, setLang, theme, setTheme, unitSystem, setUnitSystem }),
    [lang, theme, unitSystem],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  const value = useContext(AppSettingsContext);
  if (!value) throw new Error("useAppSettings must be used inside AppSettingsProvider.");
  return value;
}

// Extracted from the old standalone HTML files. Keep values verbatim unless the source HTML changes.

export const EXPANDER_MULTIPLIERS = [1.5, 2, 2.5, 3, 4, 5] as const;
export const DEFAULT_ALIGNMENT_LOSS = 0.04;

export const AXES = ["x", "y"] as const;
export const DPI_TARGETS = [250, 254, 300, 333, 400, 423, 500, 600, 800, 1000] as const;
export const CLEAN_MICROSTEP_COUNTS = [4, 5, 6, 7, 8, 9, 10, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const SUPPORTED_LANGUAGES = ['en', 'el', 'de', 'fr', 'es', 'it', 'tr'] as const;
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
] as const;
export const SUPPORTED_UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export const SUPPORTED_THEMES = ['light', 'dark'] as const;

import { de } from "@/locales/de";
import { el } from "@/locales/el";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it } from "@/locales/it";
import { tr } from "@/locales/tr";
import type { Lang } from "@/types";

export const LOCALES = { en, el, de, fr, es, it, tr } as const;

export function getLocale(lang: Lang) {
  return LOCALES[lang];
}

export const SPOT_TEXT = Object.fromEntries(
  Object.entries(LOCALES).map(([key, locale]) => [key, locale.spot]),
) as Record<Lang, typeof en.spot>;

export const SPOT_INFO = Object.fromEntries(
  Object.entries(LOCALES).map(([key, locale]) => [key, locale.spotInfo]),
) as Record<Lang, typeof en.spotInfo>;

export const AXIS_TEXT = Object.fromEntries(
  Object.entries(LOCALES).map(([key, locale]) => [key, locale.axis]),
) as Record<Lang, typeof en.axis>;

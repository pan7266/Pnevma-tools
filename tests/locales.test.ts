import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { de } from "../locales/de";
import { el } from "../locales/el";
import { en } from "../locales/en";
import { es } from "../locales/es";
import { fr } from "../locales/fr";
import { it as italian } from "../locales/it";
import { tr } from "../locales/tr";

type Leaf = [path: string, value: unknown];

function flatten(value: unknown, prefix = ""): Leaf[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, value]];
}

function getPath(value: unknown, path: string): unknown {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, part) => {
      if (Array.isArray(current)) return current[Number(part)];
      if (current && typeof current === "object") return (current as Record<string, unknown>)[part];
      return undefined;
    }, value);
}

const localePacks = { de, fr, es, it: italian, tr };

const allowedSameValues = new Set([
  "Pnevma Tools",
  "Pnevma",
  "EN",
  "EL",
  "N/A",
  "%",
  "MDF",
  "PMMA",
  "II-VI / Coherent",
  "DPI",
  "mA",
  "W",
  "mm",
  "µm",
  "M²",
  "JSON",
  "REST",
  "SDS",
  "CAD",
  "MXL",
  "GT2",
]);

const allowedSamePaths = new Set([
  "common.appName",
  "common.imperial",
  "spot.percentUnit",
  "spot.english",
  "spot.greek",
  "spot.digital",
  "spot.analog",
  "spot.normal",
  "spot.minPower",
  "spot.maxPower",
  "spot.source",
  "spot.exact",
  "spot.stable",
  "spot.borderline",
  "spot.excitation",
  "spot.transmission",
  "spot.formula",
  "axis.no",
  "axis.status",
  "axis.controllerStatus",
  "axis.spotStatus",
  "kerf.material",
  "kerf.stepMaterial",
  "kerf.extraction",
]);

describe("locale coverage", () => {
  it("keeps every non-source locale structurally complete", () => {
    const englishLeaves = flatten(en);

    for (const [lang, pack] of Object.entries(localePacks)) {
      const missing = englishLeaves
        .map(([path]) => path)
        .filter((path) => getPath(pack, path) === undefined);

      expect(missing, `${lang} missing locale keys`).toEqual([]);
    }
  });

  it("does not silently inherit English locale modules", () => {
    for (const lang of Object.keys(localePacks)) {
      const source = readFileSync(new URL(`../locales/${lang}.ts`, import.meta.url), "utf8");
      expect(source).not.toMatch(/\.\.\.en/);
      expect(source).not.toMatch(/from\s+["']@\/locales\/en["']/);
    }
  });

  it("keeps exact English matches limited to technical or same-spelling terms", () => {
    const englishLeaves = flatten(en);

    for (const [lang, pack] of Object.entries(localePacks)) {
      const unexpected = englishLeaves
        .filter(([path, englishValue]) => {
          const value = getPath(pack, path);
          return (
            typeof englishValue === "string" &&
            value === englishValue &&
            !allowedSameValues.has(englishValue) &&
            !allowedSamePaths.has(path)
          );
        })
        .map(([path, value]) => `${path}: ${value}`);

      expect(unexpected, `${lang} unexpected English matches`).toEqual([]);
    }
  });

  it("keeps Greek and English available as source locales", () => {
    expect(en.common.appName).toBe("Pnevma Tools");
    expect(el.common.toolsAria).toContain("Εργαλεία");
  });
});

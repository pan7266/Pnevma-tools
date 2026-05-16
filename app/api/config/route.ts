import { NextResponse } from "next/server";
import { axisDefaultValues, spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { AXIS_TEXT, SPOT_INFO, SPOT_TEXT } from "@/lib/data/i18n";
import { FOCAL_LENGTHS, LENS_DIAMETERS, LENS_SHAPES } from "@/lib/data/lenses";
import { MIRROR_DIAMETERS, MIRROR_COUNT_PRESETS } from "@/lib/data/mirrors";
import {
  CLEAN_MICROSTEP_COUNTS,
  DPI_TARGETS,
  EXPANDER_MULTIPLIERS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_THEMES,
  SUPPORTED_UNIT_SYSTEMS,
} from "@/lib/data/options";
import { SOURCE_LIBRARY } from "@/lib/data/sources";
import { EXPERIMENTAL_NOTICE, OWNER } from "@/lib/data/terms";

export function GET() {
  return NextResponse.json({
    owner: OWNER,
    notices: {
      experimental: EXPERIMENTAL_NOTICE,
    },
    spot: {
      defaults: spotDefaultValues,
      finishes: FINISHES,
      mirrorFinishes: MIRROR_FINISHES,
      lensShapes: LENS_SHAPES,
      lensDiameters: LENS_DIAMETERS,
      focalLengths: FOCAL_LENGTHS,
      mirrorDiameters: MIRROR_DIAMETERS,
      mirrorCountPresets: MIRROR_COUNT_PRESETS,
      expanderMultipliers: EXPANDER_MULTIPLIERS,
      sources: SOURCE_LIBRARY,
    },
    axis: {
      defaults: axisDefaultValues,
      dpiTargets: DPI_TARGETS,
      cleanMicrostepCounts: CLEAN_MICROSTEP_COUNTS,
    },
    i18n: {
      spotText: SPOT_TEXT,
      spotInfo: SPOT_INFO,
      axisText: AXIS_TEXT,
    },
    supportedLanguages: SUPPORTED_LANGUAGES,
    supportedUnitSystems: SUPPORTED_UNIT_SYSTEMS,
    supportedThemes: SUPPORTED_THEMES,
  });
}

import { NextResponse } from "next/server";
import { axisDefaultValues, spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { FOCAL_LENGTHS, LENS_DIAMETERS, LENS_SHAPES } from "@/lib/data/lenses";
import { DEFAULT_OPTICAL_PROFILE, KERF_CALIBRATION_MODES, KERF_MATERIALS, KERF_OPERATIONS, KERF_QUALITY_GOALS } from "@/lib/data/kerf";
import { MIRROR_DIAMETERS, MIRROR_COUNT_PRESETS } from "@/lib/data/mirrors";
import { MOTOR_PRESETS } from "@/lib/data/motors";
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
import { AXIS_TEXT, LOCALES, SPOT_INFO, SPOT_TEXT } from "@/locales";

export const dynamic = "force-static";

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
      motorPresets: MOTOR_PRESETS,
    },
    kerf: {
      defaultOpticalProfile: DEFAULT_OPTICAL_PROFILE,
      materials: KERF_MATERIALS,
      operations: KERF_OPERATIONS,
      qualityGoals: KERF_QUALITY_GOALS,
      calibrationModes: KERF_CALIBRATION_MODES,
    },
    i18n: {
      locales: LOCALES,
      spotText: SPOT_TEXT,
      spotInfo: SPOT_INFO,
      axisText: AXIS_TEXT,
    },
    supportedLanguages: SUPPORTED_LANGUAGES,
    supportedUnitSystems: SUPPORTED_UNIT_SYSTEMS,
    supportedThemes: SUPPORTED_THEMES,
  });
}

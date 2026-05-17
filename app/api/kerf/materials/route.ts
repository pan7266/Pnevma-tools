import { NextResponse } from "next/server";
import {
  DEFAULT_OPTICAL_PROFILE,
  KERF_CALIBRATION_MODES,
  KERF_MATERIALS,
  KERF_OPERATIONS,
  KERF_QUALITY_GOALS,
} from "@/lib/data/kerf";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    defaultOpticalProfile: DEFAULT_OPTICAL_PROFILE,
    materials: KERF_MATERIALS,
    operations: KERF_OPERATIONS,
    qualityGoals: KERF_QUALITY_GOALS,
    calibrationModes: KERF_CALIBRATION_MODES,
  });
}

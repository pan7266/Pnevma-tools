import { NextResponse } from "next/server";
import {
  DEFAULT_LASER_MACHINE,
  DEFAULT_MACHINE_MOTION_PROFILE,
  LASER_AIR_ASSIST_LEVELS,
  LASER_MATERIAL_SEEDS,
  LASER_OPERATION_PRESET_SEEDS,
  LASER_OPERATION_TYPES,
  LASER_PROBLEM_TYPES,
  LASER_QUALITY_MODES,
} from "@/lib/data/lasercoach";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    defaultMachine: DEFAULT_LASER_MACHINE,
    defaultMotionProfile: DEFAULT_MACHINE_MOTION_PROFILE,
    materialSeeds: LASER_MATERIAL_SEEDS,
    operationPresetSeeds: LASER_OPERATION_PRESET_SEEDS,
    operationTypes: LASER_OPERATION_TYPES,
    qualityModes: LASER_QUALITY_MODES,
    airAssistLevels: LASER_AIR_ASSIST_LEVELS,
    problemTypes: LASER_PROBLEM_TYPES,
  });
}

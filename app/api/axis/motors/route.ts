import { NextResponse } from "next/server";
import { MOTOR_PRESETS } from "@/lib/data/motors";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    motorPresets: MOTOR_PRESETS,
  });
}

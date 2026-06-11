import { NextResponse } from "next/server";
import { getLaserCoachData } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withRequestLog(request, async () => {
    const data = await getLaserCoachData();
    return NextResponse.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      machines: data.machines,
      motionProfiles: data.motionProfiles,
      materials: data.materials,
      operationPresets: data.operationPresets,
      corrections: data.corrections,
      correctionHistory: data.correctionHistory,
    });
  });
}

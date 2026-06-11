import { NextResponse } from "next/server";
import { getLaserCoachData } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withRequestLog(request, async () => {
    const url = new URL(request.url);
    const machineId = url.searchParams.get("laserMachineId");
    const materialId = url.searchParams.get("materialId");
    const operationType = url.searchParams.get("operationType");
    const data = await getLaserCoachData();
    const corrections = data.corrections.filter((item) => {
      if (machineId && item.laserMachineId !== machineId) return false;
      if (materialId && item.materialId !== materialId) return false;
      if (operationType && item.operationType !== operationType) return false;
      return true;
    });
    return NextResponse.json({ corrections });
  });
}

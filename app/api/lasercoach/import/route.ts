import { NextResponse } from "next/server";
import { replaceLaserCoachData } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }
    const data = await replaceLaserCoachData(body);
    return NextResponse.json({ data });
  });
}

import { NextResponse } from "next/server";
import { calculateSpot } from "@/lib/calculators/spot";
import { withRequestLog } from "@/lib/server/request-logs";
import { validateSpotInputs } from "@/lib/validation/spot-validation";

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }

    const validation = validateSpotInputs(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    return NextResponse.json(calculateSpot(validation.value));
  });
}

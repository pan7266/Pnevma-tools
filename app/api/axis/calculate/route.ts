import { NextResponse } from "next/server";
import { calculateAxis } from "@/lib/calculators/axis";
import { withRequestLog } from "@/lib/server/request-logs";
import { validateAxisInputs } from "@/lib/validation/axis-validation";

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }

    const validation = validateAxisInputs(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    return NextResponse.json(calculateAxis(validation.value));
  });
}

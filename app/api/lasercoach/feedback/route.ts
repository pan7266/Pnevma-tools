import { NextResponse } from "next/server";
import { correctionMatchesRecommendation, processLaserJobFeedback } from "@/lib/calculators/lasercoach";
import { getLaserCoachData, upsertLaserCoachItem } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";
import { validateLaserJobFeedback } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }
    const validation = validateLaserJobFeedback(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    const data = await getLaserCoachData();
    const recommendation = data.recommendations.find((item) => item.id === validation.value?.recommendationId);
    if (!recommendation) {
      return NextResponse.json({ errors: ["Recommendation was not found."] }, { status: 404 });
    }
    const existingCorrection = data.corrections.find((item) => correctionMatchesRecommendation(item, recommendation)) || null;
    const result = processLaserJobFeedback({
      feedback: validation.value,
      recommendation,
      correction: existingCorrection,
    });
    await upsertLaserCoachItem("feedback", validation.value);
    await upsertLaserCoachItem("corrections", result.correction);
    await upsertLaserCoachItem("correctionHistory", result.history);
    return NextResponse.json({ feedback: validation.value, correction: result.correction, history: result.history, warnings: result.warnings });
  });
}

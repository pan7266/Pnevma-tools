import { NextResponse } from "next/server";
import { correctionMatchesPreset, createLaserRecommendation } from "@/lib/calculators/lasercoach";
import { getLaserCoachData, upsertLaserCoachItem } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";
import { validateRecommendationRequest } from "@/lib/validation/lasercoach-validation";
import type { LaserDesiredQuality, LaserOperationType } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }
    const validation = validateRecommendationRequest(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const data = await getLaserCoachData();
    const machine = data.machines.find((item) => item.id === validation.value?.laserMachineId);
    const motionProfile = data.motionProfiles.find((item) => item.id === validation.value?.motionProfileId);
    const material = data.materials.find((item) => item.id === validation.value?.materialId);
    const preset = data.operationPresets.find((item) => item.id === validation.value?.operationPresetId);
    const analysis = data.vectorAnalyses.find((item) => item.id === validation.value?.vectorAnalysisId);
    if (!machine || !motionProfile || !material || !preset || !analysis) {
      return NextResponse.json({ errors: ["Machine, motion profile, material, preset, or analysis was not found."] }, { status: 404 });
    }
    const correction = data.corrections.find((item) => correctionMatchesPreset(item, machine.id, material.id, validation.value!.operationType as LaserOperationType, preset.lensFocalLengthMm)) || null;
    const recommendation = createLaserRecommendation({
      vectorJobId: validation.value.vectorJobId,
      machine,
      motionProfile,
      material,
      preset,
      analysis,
      correction,
      operationType: validation.value.operationType as LaserOperationType,
      desiredQuality: validation.value.desiredQuality as LaserDesiredQuality,
    });
    await upsertLaserCoachItem("recommendations", recommendation);
    return NextResponse.json({ recommendation });
  });
}

import { NextResponse } from "next/server";
import { analyzeSvgVector } from "@/lib/calculators/lasercoach-svg";
import { storeLaserCoachUpload, upsertLaserCoachItem } from "@/lib/server/lasercoach-store";
import { withRequestLog } from "@/lib/server/request-logs";
import { validateVectorAnalyzeRequest } from "@/lib/validation/lasercoach-validation";
import type { LaserDesiredQuality, LaserFileType, LaserOperationType, VectorAnalysis, VectorJob } from "@/types";

export const runtime = "nodejs";

function fileTypeFromName(fileName: string): LaserFileType {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "svg") return "Svg";
  if (extension === "dxf") return "Dxf";
  if (extension === "pdf") return "Pdf";
  if (extension === "ai") return "Ai";
  return "Unknown";
}

export async function POST(request: Request) {
  return withRequestLog(request, async () => {
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ errors: ["Expected a JSON object."] }, { status: 400 });
    }

    const validation = validateVectorAnalyzeRequest(body);
    if (!validation.ok || !validation.value) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const fileType = fileTypeFromName(validation.value.fileName);
    if (fileType !== "Svg") {
      return NextResponse.json({ errors: ["Only SVG analysis is implemented in this version."] }, { status: 400 });
    }

    let analysisResult;
    try {
      analysisResult = analyzeSvgVector({
        fileName: validation.value.fileName,
        svgText: validation.value.svgText,
        declaredWidthMm: validation.value.declaredWidthMm,
        declaredHeightMm: validation.value.declaredHeightMm,
      });
    } catch (error) {
      return NextResponse.json({ errors: [error instanceof Error ? error.message : "SVG analysis failed."] }, { status: 400 });
    }

    const now = new Date().toISOString();
    const uploadPath = await storeLaserCoachUpload(validation.value.fileName, analysisResult.sanitizedSvg);
    const vectorJob: VectorJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerUserId: validation.value.ownerUserId || "local-user",
      laserMachineId: validation.value.laserMachineId,
      motionProfileId: validation.value.motionProfileId,
      fileName: validation.value.fileName,
      fileType,
      originalFilePath: uploadPath,
      fileBlobReference: null,
      declaredWidthMm: validation.value.declaredWidthMm || analysisResult.detectedWidthMm || analysisResult.boundingBoxWidthMm,
      declaredHeightMm: validation.value.declaredHeightMm || analysisResult.detectedHeightMm || analysisResult.boundingBoxHeightMm,
      detectedWidthMm: analysisResult.detectedWidthMm,
      detectedHeightMm: analysisResult.detectedHeightMm,
      scaleFactor: analysisResult.scaleFactor,
      operationType: validation.value.operationType as LaserOperationType,
      materialId: validation.value.materialId,
      lensFocalLengthMm: validation.value.lensFocalLengthMm,
      desiredQuality: validation.value.desiredQuality as LaserDesiredQuality,
      createdAt: now,
      updatedAt: now,
    };
    const analysis: VectorAnalysis = {
      id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vectorJobId: vectorJob.id,
      totalCutLengthMm: analysisResult.totalCutLengthMm,
      totalScoreLengthMm: analysisResult.totalScoreLengthMm,
      estimatedEngraveAreaMm2: analysisResult.estimatedEngraveAreaMm2,
      pathCount: analysisResult.pathCount,
      openPathCount: analysisResult.openPathCount,
      closedPathCount: analysisResult.closedPathCount,
      duplicateLineCount: analysisResult.duplicateLineCount,
      tinyFeatureCount: analysisResult.tinyFeatureCount,
      smallestFeatureMm: analysisResult.smallestFeatureMm,
      smallestGapMm: analysisResult.smallestGapMm,
      sharpCornerCount: analysisResult.sharpCornerCount,
      curveSegmentCount: analysisResult.curveSegmentCount,
      boundingBoxWidthMm: analysisResult.boundingBoxWidthMm,
      boundingBoxHeightMm: analysisResult.boundingBoxHeightMm,
      hasUnsupportedElements: analysisResult.hasUnsupportedElements,
      warningsJson: analysisResult.warningsJson,
      createdAt: now,
    };

    await upsertLaserCoachItem("vectorJobs", vectorJob);
    await upsertLaserCoachItem("vectorAnalyses", analysis);
    return NextResponse.json({ vectorJob, analysis });
  });
}

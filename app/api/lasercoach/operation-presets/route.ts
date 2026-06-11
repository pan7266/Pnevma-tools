import { handleLaserCoachCollectionGet, handleLaserCoachCollectionPost } from "@/lib/server/lasercoach-api";
import { validateLaserOperationPreset } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLaserCoachCollectionGet(request, "operationPresets");
}

export async function POST(request: Request) {
  return handleLaserCoachCollectionPost(request, "operationPresets", validateLaserOperationPreset);
}

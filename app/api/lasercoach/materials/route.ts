import { handleLaserCoachCollectionGet, handleLaserCoachCollectionPost } from "@/lib/server/lasercoach-api";
import { validateLaserMaterial } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLaserCoachCollectionGet(request, "materials");
}

export async function POST(request: Request) {
  return handleLaserCoachCollectionPost(request, "materials", validateLaserMaterial);
}

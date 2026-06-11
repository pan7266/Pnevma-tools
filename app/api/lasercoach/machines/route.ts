import { handleLaserCoachCollectionGet, handleLaserCoachCollectionPost } from "@/lib/server/lasercoach-api";
import { validateLaserMachine } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLaserCoachCollectionGet(request, "machines");
}

export async function POST(request: Request) {
  return handleLaserCoachCollectionPost(request, "machines", validateLaserMachine);
}

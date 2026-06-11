import { handleLaserCoachCollectionGet, handleLaserCoachCollectionPost } from "@/lib/server/lasercoach-api";
import { validateMachineMotionProfile } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleLaserCoachCollectionGet(request, "motionProfiles");
}

export async function POST(request: Request) {
  return handleLaserCoachCollectionPost(request, "motionProfiles", validateMachineMotionProfile);
}

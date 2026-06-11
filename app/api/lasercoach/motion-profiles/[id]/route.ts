import { handleLaserCoachItemDelete, handleLaserCoachItemGet, handleLaserCoachItemPatch } from "@/lib/server/lasercoach-api";
import { validateMachineMotionProfile } from "@/lib/validation/lasercoach-validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> | { id: string } };

export async function GET(request: Request, context: Context) {
  return handleLaserCoachItemGet(request, context, "motionProfiles");
}

export async function PATCH(request: Request, context: Context) {
  return handleLaserCoachItemPatch(request, context, "motionProfiles", validateMachineMotionProfile);
}

export async function DELETE(request: Request, context: Context) {
  return handleLaserCoachItemDelete(request, context, "motionProfiles");
}

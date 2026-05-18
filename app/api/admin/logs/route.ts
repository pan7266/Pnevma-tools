import { NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedAdminResponse } from "@/lib/server/admin-auth";
import { getRequestLogs, recordRequest } from "@/lib/server/request-logs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminAuthorized(request.headers)) {
    recordRequest(request, 401);
    return unauthorizedAdminResponse();
  }

  recordRequest(request, 200);
  const logs = await getRequestLogs();
  return NextResponse.json({ logs });
}

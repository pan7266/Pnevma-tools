import { NextResponse } from "next/server";
import { SOURCE_LIBRARY } from "@/lib/data/sources";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    sources: SOURCE_LIBRARY,
  });
}

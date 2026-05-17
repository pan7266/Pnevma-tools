import { NextResponse } from "next/server";
import { spotDefaultValues } from "@/lib/data/defaults";
import { FINISHES, MIRROR_FINISHES } from "@/lib/data/finishes";
import { FOCAL_LENGTHS, LENS_DIAMETERS, LENS_SHAPES } from "@/lib/data/lenses";
import { MIRROR_DIAMETERS } from "@/lib/data/mirrors";
import { EXPANDER_MULTIPLIERS } from "@/lib/data/options";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    defaults: spotDefaultValues,
    finishes: FINISHES,
    mirrorFinishes: MIRROR_FINISHES,
    lensShapes: LENS_SHAPES,
    lensDiameters: LENS_DIAMETERS,
    focalLengths: FOCAL_LENGTHS,
    mirrorDiameters: MIRROR_DIAMETERS,
    expanderMultipliers: EXPANDER_MULTIPLIERS,
  });
}

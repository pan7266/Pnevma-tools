import { calculateAxis } from "@/lib/calculators/axis";
import type { AxisInputs, AxisResult } from "@/types";

export async function calculateAxisFromApi(input: AxisInputs): Promise<AxisResult> {
  try {
    const response = await fetch("/api/axis/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.ok) {
      return (await response.json()) as AxisResult;
    }
    if (response.status === 404 || response.status === 405) {
      return calculateAxis(input);
    }
    const payload = (await response.json().catch(() => ({}))) as { errors?: string[] };
    throw new Error(payload.errors?.join(" ") || "Axis calculation failed.");
  } catch (error) {
    if (error instanceof TypeError) {
      return calculateAxis(input);
    }
    throw error;
  }
}

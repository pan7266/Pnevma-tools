import { calculateSpot } from "@/lib/calculators/spot";
import type { SpotInputs, SpotResult } from "@/types";

export async function calculateSpotFromApi(input: SpotInputs): Promise<SpotResult> {
  try {
    const response = await fetch("/api/spot/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.ok) {
      return (await response.json()) as SpotResult;
    }
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return calculateSpot(input);
    }
    const payload = (await response.json().catch(() => ({}))) as { errors?: string[] };
    throw new Error(payload.errors?.join(" ") || "Spot calculation failed.");
  } catch (error) {
    if (error instanceof TypeError) {
      return calculateSpot(input);
    }
    throw error;
  }
}

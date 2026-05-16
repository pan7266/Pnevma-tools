import type { SpotInputs, SpotResult } from "@/types";

export async function calculateSpotFromApi(input: SpotInputs): Promise<SpotResult> {
  const response = await fetch("/api/spot/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { errors?: string[] };
    throw new Error(payload.errors?.join(" ") || "Spot calculation failed.");
  }
  return (await response.json()) as SpotResult;
}

import type { AxisInputs, AxisResult } from "@/types";

export async function calculateAxisFromApi(input: AxisInputs): Promise<AxisResult> {
  const response = await fetch("/api/axis/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { errors?: string[] };
    throw new Error(payload.errors?.join(" ") || "Axis calculation failed.");
  }
  return (await response.json()) as AxisResult;
}

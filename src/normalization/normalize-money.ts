export function normalizeMoney(value: number | string): number {
  if (typeof value === "number") {
    return Math.round(value * 100) / 100;
  }

  const cleaned = value
    .trim()
    .replace(/[$€£,\s]/g, "");

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid monetary value: ${value}`);
  }

  return Math.round(parsed * 100) / 100;
}

export function normalizePaymentTerms(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    normalized === "net 30" ||
    normalized === "30 days from invoice date"
  ) {
    return "net 30";
  }

  return normalized;
}

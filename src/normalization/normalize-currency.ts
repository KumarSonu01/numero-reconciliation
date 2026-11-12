const CURRENCY_ALIASES: Record<string, string> = {
  "$": "USD",
  "US$": "USD",
  "USD": "USD",
  "€": "EUR",
  "EUR": "EUR",
  "£": "GBP",
  "GBP": "GBP",
};

export function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();

  return CURRENCY_ALIASES[normalized] ?? normalized;
}

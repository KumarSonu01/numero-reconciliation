const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function normalizeDate(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();

  // Already ISO.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // US numeric format: MM/DD/YYYY.
  const usMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month}-${day}`;
  }

  // Natural language format: June 5, 2025.
  // Parse manually so timezone conversion cannot shift the date.
  const longDateMatch =
    /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(trimmed);

  if (longDateMatch) {
    const [, monthName, day, year] = longDateMatch;
    const month = MONTHS[monthName.toLowerCase()];

    if (!month) {
      return trimmed;
    }

    return `${year}-${month}-${day.padStart(2, "0")}`;
  }

  return trimmed;
}

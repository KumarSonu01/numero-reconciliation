import type { Address, Contract } from "../types/contract.js";

export type FieldMatchStatus = "match" | "mismatch";

export interface FieldComparison {
  field: string;
  status: FieldMatchStatus;
  sourceValue: unknown;
  targetValue: unknown;
}

function normalizeCompanyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\b(incorporated|inc|corporation|corp)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function companyNamesEqual(a?: string, b?: string): boolean {
  return normalizeCompanyName(a ?? "") === normalizeCompanyName(b ?? "");
}

function addressesEqual(a: Address, b: Address): boolean {
  return (
    companyNamesEqual(a.companyName, b.companyName) &&
    a.street.trim().toLowerCase() ===
      b.street.trim().toLowerCase() &&
    a.city.trim().toLowerCase() ===
      b.city.trim().toLowerCase() &&
    (a.state ?? "").trim().toLowerCase() ===
      (b.state ?? "").trim().toLowerCase() &&
    (a.postalCode ?? "").trim().toLowerCase() ===
      (b.postalCode ?? "").trim().toLowerCase() &&
    a.country.trim().toLowerCase() ===
      b.country.trim().toLowerCase()
  );
}

function valuesEqual(
  field: keyof Contract,
  sourceValue: unknown,
  targetValue: unknown,
): boolean {
  if (field === "customerName") {
    return companyNamesEqual(
      sourceValue as string,
      targetValue as string,
    );
  }

  if (field === "billToAddress" || field === "shipToAddress") {
    return addressesEqual(
      sourceValue as Address,
      targetValue as Address,
    );
  }

  return sourceValue === targetValue;
}

export function compareFields(
  source: Contract,
  target: Contract,
): FieldComparison[] {
  const fields: Array<keyof Contract> = [
    "customerName",
    "contractCurrency",
    "totalContractValue",
    "paymentTerms",
    "contractStartDate",
    "contractEndDate",
    "signatureDate",
    "quoteId",
    "billToAddress",
    "shipToAddress",
  ];

  return fields.map((field) => {
    const sourceValue = source[field];
    const targetValue = target[field];

    return {
      field,
      status: valuesEqual(field, sourceValue, targetValue)
        ? "match"
        : "mismatch",
      sourceValue,
      targetValue,
    };
  });
}
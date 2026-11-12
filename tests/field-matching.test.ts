import { describe, expect, it } from "vitest";
import { compareFields } from "../src/matching/field-matcher.js";
import type { Contract } from "../src/types/contract.js";

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    customerName: "Acme Corporation",
    contractCurrency: "USD",
    totalContractValue: 165000,
    paymentTerms: "net 30",
    contractStartDate: "2025-06-05",
    contractEndDate: "2026-06-04",
    signatureDate: "2025-06-06",
    quoteId: "Q-00041",
    billToAddress: {
      street: "123 Business Plaza Drive",
      city: "Anytown",
      state: "ST 12345",
      country: "United States",
    },
    shipToAddress: {
      street: "123 Business Plaza Drive",
      city: "Anytown",
      state: "ST 12345",
      country: "United States",
    },
    lineItems: [],
    ...overrides,
  };
}

describe("compareFields", () => {
  it("detects a clean contract with no field mismatches", () => {
    const source = makeContract();
    const target = makeContract();

    const result = compareFields(source, target);

    expect(result).toHaveLength(10);
    expect(result.every((field) => field.status === "match")).toBe(true);
  });

  it("detects a genuine total contract value mismatch", () => {
    const source = makeContract();
    const target = makeContract({
      totalContractValue: 165000 - 9000,
    });

    const result = compareFields(source, target);

    const amount = result.find(
      (field) => field.field === "totalContractValue",
    );

    expect(amount?.status).toBe("mismatch");
    expect(amount?.sourceValue).toBe(165000);
    expect(amount?.targetValue).toBe(156000);
  });

  it("detects a currency mismatch", () => {
    const source = makeContract();
    const target = makeContract({
      contractCurrency: "EUR",
    });

    const result = compareFields(source, target);

    const currency = result.find(
      (field) => field.field === "contractCurrency",
    );

    expect(currency?.status).toBe("mismatch");
  });
});

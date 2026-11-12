import { describe, expect, it } from "vitest";
import { reconcileContracts } from "../src/reconciliation/reconcile.js";
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
    lineItems: [
      {
        product: "Cyber Insurance",
        quantity: 3,
        unitPrice: 10000,
        discount: 0,
      },
    ],
    ...overrides,
  };
}

describe("reconcileContracts", () => {
  it("returns clean for identical contracts", () => {
    const result = reconcileContracts(
      makeContract(),
      makeContract(),
    );

    expect(result.status).toBe("clean");
    expect(result.mismatches).toHaveLength(0);
  });

  it("returns mismatch when contract value differs", () => {
    const result = reconcileContracts(
      makeContract(),
      makeContract({
        totalContractValue: 165000 - 9000,
      }),
    );

    expect(result.status).toBe("mismatch");

    expect(result.mismatches).toContainEqual({
      type: "field",
      field: "totalContractValue",
      differences: ["Source and target values differ"],
    });
  });

  it("returns mismatch when a line item differs", () => {
    const result = reconcileContracts(
      makeContract(),
      makeContract({
        lineItems: [
          {
            product: "Cyber Insurance",
            quantity: 2,
            unitPrice: 10000,
            discount: 0,
          },
        ],
      }),
    );

    expect(result.status).toBe("mismatch");

    expect(result.mismatches).toContainEqual({
      type: "line_item",
      product: "Cyber Insurance",
      differences: ["quantity"],
    });
  });
});

import { describe, expect, it } from "vitest";
import { normalizeContract } from "../src/normalization/normalize-fields.js";
import type { Contract } from "../src/types/contract.js";

describe("normalizeContract", () => {
  const baseContract: Contract = {
    customerName: " Acme Corporation ",
    contractCurrency: "USD",
    totalContractValue: 165000,
    paymentTerms: "Net 30",
    contractStartDate: "2025-06-05",
    contractEndDate: "2026-06-04",
    signatureDate: "2025-06-06",
    quoteId: " Q-00041 ",
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
        product: " Cyber Insurance ",
        quantity: 3,
        unitPrice: 10000,
        discount: 0,
      },
    ],
  };

  it("normalizes equivalent field formats", () => {
    const result = normalizeContract({
      ...baseContract,
      contractStartDate: "06/05/2025",
      contractEndDate: "06/04/2026",
      signatureDate: "06/06/2025",
      paymentTerms: "30 days from invoice date",
      contractCurrency: "$",
      lineItems: [
        {
          ...baseContract.lineItems[0],
          unitPrice: 10_000,
        },
      ],
    });

    expect(result.customerName).toBe("Acme Corporation");
    expect(result.contractCurrency).toBe("USD");
    expect(result.totalContractValue).toBe(165000);
    expect(result.paymentTerms).toBe("net 30");
    expect(result.contractStartDate).toBe("2025-06-05");
    expect(result.contractEndDate).toBe("2026-06-04");
    expect(result.signatureDate).toBe("2025-06-06");
    expect(result.quoteId).toBe("Q-00041");
    expect(result.lineItems[0].product).toBe("Cyber Insurance");
    expect(result.lineItems[0].unitPrice).toBe(10000);
  });

  it("preserves genuine currency differences", () => {
    const result = normalizeContract({
      ...baseContract,
      contractCurrency: "EUR",
    });

    expect(result.contractCurrency).toBe("EUR");
    expect(result.contractCurrency).not.toBe("USD");
  });
});

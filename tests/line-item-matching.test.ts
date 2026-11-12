import { describe, expect, it } from "vitest";
import { compareLineItems } from "../src/matching/line-item-matcher.js";
import type { ContractLineItem } from "../src/types/contract.js";

const cyberInsurance: ContractLineItem = {
  product: "Cyber Insurance",
  quantity: 3,
  unitPrice: 10000,
  discount: 0,
};

const endpointSecurity: ContractLineItem = {
  product: "End Point Security",
  quantity: 2,
  unitPrice: 25000,
  discount: 0,
};

describe("compareLineItems", () => {
  it("matches equivalent products regardless of product-name casing", () => {
    const result = compareLineItems(
      [cyberInsurance],
      [
        {
          ...cyberInsurance,
          product: " cyber insurance ",
        },
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("match");
  });

  it("detects a quantity mismatch", () => {
    const result = compareLineItems(
      [cyberInsurance],
      [
        {
          ...cyberInsurance,
          quantity: 2,
        },
      ],
    );

    expect(result[0].status).toBe("mismatch");
    expect(result[0].differences).toContain("quantity");
  });

  it("reports a product present only in the target", () => {
    const result = compareLineItems(
      [cyberInsurance],
      [cyberInsurance, endpointSecurity],
    );

    expect(result).toHaveLength(2);

    const extra = result.find(
      (item) => item.product === "End Point Security",
    );

    expect(extra?.status).toBe("missing");
    expect(extra?.differences).toContain("Line item not found in source");
  });
});

import { describe, expect, it } from "vitest";
import path from "node:path";
import { loadBundle } from "../src/ingestion/bundle-loader.js";
import { extractPdfText } from "../src/extraction/pdf-extractor.js";
import { extractContractWithAI } from "../src/extraction/ai-extractor.js";
import { normalizeContract } from "../src/normalization/normalize-fields.js";
import { reconcileContracts } from "../src/reconciliation/reconcile.js";

describe("Case 1 clean fixture", () => {
  it("extracts the supplied PDF text", async () => {
    const fixturePath = path.resolve("fixtures/01-clean");

    const text = await extractPdfText(
      path.join(fixturePath, "order-form.pdf"),
    );

    expect(text).toContain("Q-00041");
    expect(text).toContain("Acme Corporation");
    expect(text).toContain("165,000.00");
    expect(text).toContain("Cyber Insurance");
    expect(text).toContain("Incident Response");
  });

  it(
  "extracts the contract using the local AI model",
  async () => {
    const fixturePath = path.resolve("fixtures/01-clean");

    const pdfText = await extractPdfText(
      path.join(fixturePath, "order-form.pdf"),
    );

    const extracted = await extractContractWithAI(pdfText);

    expect(extracted.quoteId).toBe("Q-00041");
    expect(extracted.customerName).toBe("Acme Corporation");
    expect(extracted.contractCurrency).toBe("USD");
    expect(extracted.totalContractValue).toBe(165000);
    expect(extracted.lineItems).toHaveLength(4);

    expect(extracted.lineItems.map((item) => item.product)).toEqual([
      "Cyber Insurance",
      "End Point Security",
      "Incident360",
      "Incident Response",
    ]);
  },
  30000,
);

  it("reconciles the document against CRM and ERP successfully", async () => {
  const fixturePath = path.resolve("fixtures/01-clean");

  const bundle = await loadBundle(fixturePath);

  const pdfText = await extractPdfText(bundle.pdfPath);
  const document = normalizeContract(
    await extractContractWithAI(pdfText),
  );

  const crm = normalizeContract(bundle.crm);
  const erp = normalizeContract(bundle.erp);

  const crmResult = reconcileContracts(document, crm);
  const erpResult = reconcileContracts(document, erp);

  expect(crmResult.status).toBe("clean");
  expect(crmResult.mismatches).toHaveLength(0);

  expect(erpResult.status).toBe("clean");
  expect(erpResult.mismatches).toHaveLength(0);

  expect(document.quoteId).toBe("Q-00041");
  expect(document.totalContractValue).toBe(165000);
  expect(document.contractCurrency).toBe("USD");
  expect(document.lineItems).toHaveLength(4);
});
});
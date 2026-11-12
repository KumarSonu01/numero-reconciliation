import {
  contractSchema,
  type ExtractedContract,
} from "./extraction-schema.js";
import { buildExtractionContext } from "./extraction-context.js";
import {
  parseContractFromPdfText,
  parsePdfFields,
} from "./pdf-contract-parser.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:3b";

const aiSchema = {
  quoteId: "string",
  customerName: "string",
  total: 0,
  currency: "string",
  products: ["string"],
};

const SYSTEM_PROMPT = `
Extract only these semantic contract fields from the order form.

Return ONLY valid JSON:

{
  "quoteId": "string",
  "customerName": "string",
  "total": 0,
  "currency": "string",
  "products": ["string"]
}

Rules:
- Extract only information explicitly present.
- Do not invent values.
- total must be a number without currency symbols or commas.
- products must contain every product name from the Products & Services section.
- Return JSON only.
`;

interface AIExtraction {
  quoteId: string;
  customerName: string;
  total: number;
  currency: string;
  products: string[];
}

export async function extractContractWithAI(
  pdfText: string,
): Promise<ExtractedContract> {
  const cleanedText = pdfText.trim();

  const requiredMarkers = [
    "ORDER FORM",
    "Quote Reference:",
    "Customer Information",
    "Products & Services",
  ];

  const hasOrderFormStructure = requiredMarkers.every((marker) =>
    cleanedText.includes(marker),
  );

  if (!hasOrderFormStructure) {
    throw new Error(
      "Document extraction failed: order form text is unreadable or structurally invalid",
    );
  }

  if (cleanedText.length < 50) {
    throw new Error(
      "Document extraction failed: order form contains no extractable contract data",
    );
  }

  const extractionContext = buildExtractionContext(cleanedText);

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: `
Extract the contract from this order form.

Expected structure:
${JSON.stringify(aiSchema)}

ORDER FORM:
${extractionContext}
`,
      stream: false,
      format: "json",
      options: {
        temperature: 0,
        num_predict: 200,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    response?: string;
  };

  if (!data.response) {
    throw new Error("Ollama returned an empty response");
  }

  let aiResult: AIExtraction;

  try {
    aiResult = JSON.parse(data.response) as AIExtraction;
  } catch {
    throw new Error("Ollama returned invalid JSON");
  }

  const pdfFields = parsePdfFields(cleanedText);
  const lineItems = parseContractFromPdfText(cleanedText);

  if (aiResult.quoteId !== pdfFields.quoteId) {
    throw new Error(
      `AI/PDF quote mismatch: ${aiResult.quoteId} vs ${pdfFields.quoteId}`,
    );
  }

  if (aiResult.currency !== pdfFields.contractCurrency) {
    throw new Error(
      `AI/PDF currency mismatch: ${aiResult.currency} vs ${pdfFields.contractCurrency}`,
    );
  }

  if (aiResult.total !== pdfFields.totalContractValue) {
    throw new Error(
      `AI/PDF total mismatch: ${aiResult.total} vs ${pdfFields.totalContractValue}`,
    );
  }

  if (aiResult.products.length !== lineItems.length) {
    throw new Error(
      `AI/PDF product count mismatch: ${aiResult.products.length} vs ${lineItems.length}`,
    );
  }

  for (const product of aiResult.products) {
    const exists = lineItems.some(
      (item) => item.product.toLowerCase() === product.toLowerCase(),
    );

    if (!exists) {
      throw new Error(`AI extracted unknown product: ${product}`);
    }
  }

  const result: ExtractedContract = {
    quoteId: pdfFields.quoteId,
    customerName: aiResult.customerName,
    contractCurrency: pdfFields.contractCurrency,
    totalContractValue: pdfFields.totalContractValue,
    paymentTerms: pdfFields.paymentTerms,
    contractStartDate: pdfFields.contractStartDate,
    contractEndDate: pdfFields.contractEndDate,
    signatureDate: pdfFields.signatureDate,
    billToAddress: {
      companyName: pdfFields.billToAddress.companyName ?? "",
      street: pdfFields.billToAddress.street,
      city: pdfFields.billToAddress.city,
      state: pdfFields.billToAddress.state ?? "",
      postalCode: pdfFields.billToAddress.postalCode ?? "",
      country: pdfFields.billToAddress.country,
    },
    shipToAddress: {
      companyName: pdfFields.shipToAddress.companyName ?? "",
      street: pdfFields.shipToAddress.street,
      city: pdfFields.shipToAddress.city,
      state: pdfFields.shipToAddress.state ?? "",
      postalCode: pdfFields.shipToAddress.postalCode ?? "",
      country: pdfFields.shipToAddress.country,
    },
    lineItems,
  };

  return contractSchema.parse(result);
}
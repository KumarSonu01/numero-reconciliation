import type { Address, ContractLineItem } from "../types/contract.js";

function requiredMatch(
  text: string,
  pattern: RegExp,
  field: string,
): string {
  const match = pattern.exec(text);

  if (!match?.[1]) {
    throw new Error(`Could not extract ${field} from order form`);
  }

  return match[1].trim();
}

function parseAddressSection(
  text: string,
  sectionName: "Bill To" | "Ship To",
): Address {
  const start = text.indexOf(sectionName);

  if (start === -1) {
    throw new Error(`Could not find ${sectionName} section`);
  }

  const remaining = text.slice(start + sectionName.length);

  const nextSection = remaining.search(
    sectionName === "Bill To"
      ? /\nShip To\b/
      : /\nProducts & Services\b/,
  );

  const section =
    nextSection >= 0
      ? remaining.slice(0, nextSection)
      : remaining;

  const companyMatch = /Company:\s*([\s\S]*?)\nAddress:/.exec(section);
  const addressMatch = /Address:\s*([\s\S]*?)\nCity:/.exec(section);
  const cityMatch = /City:\s*([^\n]+)\nCountry:/.exec(section);
  const countryMatch = /Country:\s*([^\n]+)/.exec(section);

  if (!companyMatch || !addressMatch || !cityMatch || !countryMatch) {
    throw new Error(`Could not parse ${sectionName} address`);
  }

  const companyName = companyMatch[1]
    .replace(/\s+/g, " ")
    .trim();

  const street = addressMatch[1]
    .replace(/\s+/g, " ")
    .trim();

  const cityStatePostal = cityMatch[1]
    .replace(/\s+/g, " ")
    .trim();

  const cityStateMatch =
    /^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(
      cityStatePostal,
    );

  if (!cityStateMatch) {
    throw new Error(`Could not parse ${sectionName} city/state/postal code`);
  }

  return {
    companyName,
    street,
    city: cityStateMatch[1].trim(),
    state: cityStateMatch[2],
    postalCode: cityStateMatch[3],
    country: countryMatch[1].trim(),
  };
}

function parseLineItems(text: string): ContractLineItem[] {
  const productsStart = text.indexOf("Products & Services");

  if (productsStart === -1) {
    throw new Error("Could not find Products & Services section");
  }

  const totalStart = text.indexOf("Subtotal:", productsStart);

  if (totalStart === -1) {
    throw new Error("Could not find line-item subtotal");
  }

  const section = text.slice(productsStart, totalStart);

  const lineItems: ContractLineItem[] = [];

  const linePattern =
    /^\s*(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})\s*$/gm;

  for (const match of section.matchAll(linePattern)) {
    const [, , product, quantity, unitPrice] = match;

    lineItems.push({
      product: product.trim(),
      quantity: Number(quantity),
      unitPrice: Number(unitPrice.replace(/,/g, "")),
      discount: 0,
    });
  }

  if (lineItems.length === 0) {
    throw new Error("Could not extract any line items");
  }

  return lineItems;
}

export function parseContractFromPdfText(text: string): ContractLineItem[] {
  return parseLineItems(text);
}

export function parsePdfFields(text: string): {
  quoteId: string;
  contractCurrency: string;
  totalContractValue: number;
  paymentTerms: string;
  contractStartDate: string;
  contractEndDate: string;
  signatureDate: string;
  billToAddress: Address;
  shipToAddress: Address;
} {
  const quoteId = requiredMatch(
    text,
    /Quote Reference:\s*([^\n]+)/,
    "quote ID",
  );

  const contractCurrency = requiredMatch(
    text,
    /Currency:\s*([A-Z]{3})/,
    "currency",
  );

  const totalRaw = requiredMatch(
    text,
    /TOTAL AMOUNT:\s*\$([\d,]+\.\d{2})/,
    "total contract value",
  );

  const startDate = requiredMatch(
    text,
    /Start Date:\s*([^\n]+)/,
    "contract start date",
  );

  const endDate = requiredMatch(
    text,
    /End Date:\s*([^\n]+)/,
    "contract end date",
  );

  const paymentTerms = requiredMatch(
    text,
    /Payment\s*\nTerms:\s*\n([^\n]+)/,
    "payment terms",
  );

  const signatureSectionIndex = text.indexOf("Customer Authorization");

  if (signatureSectionIndex === -1) {
    throw new Error("Could not find customer authorization section");
  }

  const signatureSection = text.slice(signatureSectionIndex);

  const signatureDate = requiredMatch(
    signatureSection,
    /Acme Corporation\s*\nDate:\s*([^\n]+)/,
    "signature date",
  );

  return {
    quoteId,
    contractCurrency,
    totalContractValue: Number(totalRaw.replace(/,/g, "")),
    paymentTerms,
    contractStartDate: startDate,
    contractEndDate: endDate,
    signatureDate,
    billToAddress: parseAddressSection(text, "Bill To"),
    shipToAddress: parseAddressSection(text, "Ship To"),
  };
}

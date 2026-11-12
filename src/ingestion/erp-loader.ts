import fs from "node:fs/promises";
import type { Contract } from "../types/contract.js";

interface ErpRecord {
  entity: { companyName: string };
  total: string;
  currency: { symbol: string };
  terms: { name: string };
  startDate: string;
  endDate: string;
  signatureDate?: string;
  quoteId: string;
  billTo: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  shipTo: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  items: Array<{
    itemCode: string;
    name: string;
    qty: string;
    rate: string;
    discountPct: string;
  }>;
}

function parseMoney(value: string): number {
  return Number(value.replace(/[$,\s]/g, ""));
}

function parsePercent(value: string): number {
  return Number(value.replace(/[%\s]/g, ""));
}

function parseCurrency(symbol: string): string {
  const currencies: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
  };

  return currencies[symbol] ?? symbol;
}

function parseErpAddress(address: {
  address: string;
  city: string;
  state: string;
  country: string;
}) {
  const postalMatch = /^(.+?)\s+(\d{5}(?:-\d{4})?)$/.exec(
    address.state.trim(),
  );

  return {
    street: address.address,
    city: address.city,
    state: postalMatch?.[1] ?? address.state,
    postalCode: postalMatch?.[2] ?? "",
    country: address.country,
  };
}

export async function loadErp(filePath: string): Promise<Contract> {
  const raw = await fs.readFile(filePath, "utf8");
  const record = JSON.parse(raw) as ErpRecord;

  return {
    customerName: record.entity.companyName,
    contractCurrency: parseCurrency(record.currency.symbol),
    totalContractValue: parseMoney(record.total),
    paymentTerms: record.terms.name,
    contractStartDate: record.startDate,
    contractEndDate: record.endDate,
    signatureDate: record.signatureDate,
    quoteId: record.quoteId,

    billToAddress: {
      ...parseErpAddress(record.billTo),
      companyName: record.entity.companyName,
    },

    shipToAddress: {
      ...parseErpAddress(record.shipTo),
      companyName: record.entity.companyName,
    },

    lineItems: record.items.map((item) => ({
      product: item.name,
      quantity: Number(item.qty),
      unitPrice: parseMoney(item.rate),
      discount: parsePercent(item.discountPct),
    })),
  };
}
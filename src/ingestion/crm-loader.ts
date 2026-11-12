import fs from "node:fs/promises";
import type { Contract } from "../types/contract.js";

interface CrmRecord {
  Account_Name__c: string;
  Amount: number;
  CurrencyIsoCode: string;
  Payment_Terms__c: string;
  Subscription_Start__c: string;
  Subscription_End__c: string;
  Signature_Date__c?: string;
  Quote_Id__c: string;
  Bill_To_Address__c: string;
  Ship_To_Address__c: string;
  LineItems: Array<{
    "Product2.Name": string;
    Quantity: number;
    UnitPrice: number;
    Discount: number;
  }>;
}

function parseSimpleAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim());

  const street = parts[0] ?? "";
  const city = parts[1] ?? "";
  const statePostal = parts[2] ?? "";
  const country = parts[3] ?? "";

  const statePostalMatch = /^(.+?)\s+(\d{5}(?:-\d{4})?)$/.exec(
    statePostal,
  );

  return {
    street,
    city,
    state: statePostalMatch?.[1] ?? statePostal,
    postalCode: statePostalMatch?.[2] ?? "",
    country,
  };
}

export async function loadCrm(filePath: string): Promise<Contract> {
  const raw = await fs.readFile(filePath, "utf8");
  const record = JSON.parse(raw) as CrmRecord;

  return {
  customerName: record.Account_Name__c,
  contractCurrency: record.CurrencyIsoCode,
  totalContractValue: record.Amount,
  paymentTerms: record.Payment_Terms__c,
  contractStartDate: record.Subscription_Start__c,
  contractEndDate: record.Subscription_End__c,
  signatureDate: record.Signature_Date__c,
  quoteId: record.Quote_Id__c,

  billToAddress: {
    ...parseSimpleAddress(record.Bill_To_Address__c),
    companyName: record.Account_Name__c,
  },

  shipToAddress: {
    ...parseSimpleAddress(record.Ship_To_Address__c),
    companyName: record.Account_Name__c,
  },

  lineItems: record.LineItems.map((item) => ({
    product: item["Product2.Name"],
    quantity: item.Quantity,
    unitPrice: item.UnitPrice,
    discount: item.Discount,
  })),
};
}

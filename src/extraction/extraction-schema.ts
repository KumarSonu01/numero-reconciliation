import { z } from "zod";

const addressSchema = z.object({
  companyName: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

const lineItemSchema = z.object({
  product: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
});

export const contractSchema = z.object({
  quoteId: z.string(),
  customerName: z.string(),
  contractCurrency: z.string(),
  totalContractValue: z.number(),
  paymentTerms: z.string(),
  contractStartDate: z.string(),
  contractEndDate: z.string(),
  signatureDate: z.string(),
  billToAddress: addressSchema,
  shipToAddress: addressSchema,
  lineItems: z.array(lineItemSchema),
});

export type ExtractedContract = z.infer<typeof contractSchema>;

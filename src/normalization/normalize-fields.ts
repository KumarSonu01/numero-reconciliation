import type { Contract } from "../types/contract.js";
import { normalizeDate } from "./normalize-date.js";
import { normalizeMoney } from "./normalize-money.js";
import { normalizeCurrency } from "./normalize-currency.js";
import { normalizePaymentTerms } from "./normalize-terms.js";

export function normalizeContract(contract: Contract): Contract {
  return {
    ...contract,

    customerName: contract.customerName.trim(),

    contractCurrency: normalizeCurrency(contract.contractCurrency),

    totalContractValue: normalizeMoney(contract.totalContractValue),

    paymentTerms: normalizePaymentTerms(contract.paymentTerms),

    contractStartDate: normalizeDate(contract.contractStartDate) ?? "",
    contractEndDate: normalizeDate(contract.contractEndDate) ?? "",
    signatureDate: normalizeDate(contract.signatureDate),

    quoteId: contract.quoteId.trim(),

    lineItems: contract.lineItems.map((item) => ({
      ...item,
      product: item.product.trim(),
      startDate: normalizeDate(item.startDate),
      endDate: normalizeDate(item.endDate),
      quantity: item.quantity,
      unitPrice: normalizeMoney(item.unitPrice),
      discount: item.discount,
    })),
  };
}

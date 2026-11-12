export interface Address {
  companyName?: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface ContractLineItem {
  product: string;
  startDate?: string;
  endDate?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface Contract {
  customerName: string;
  contractCurrency: string;
  totalContractValue: number;
  paymentTerms: string;
  contractStartDate: string;
  contractEndDate: string;
  signatureDate?: string;
  quoteId: string;
  billToAddress: Address;
  shipToAddress: Address;
  lineItems: ContractLineItem[];
}

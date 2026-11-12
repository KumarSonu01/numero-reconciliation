import type { Contract } from "../types/contract.js";

export interface StoreClient {
  updateSystem(
    system: "crm" | "erp",
    contract: Contract,
  ): Promise<void>;
}
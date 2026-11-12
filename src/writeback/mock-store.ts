import type { Contract } from "../types/contract.js";
import type { StoreClient } from "./store-client.js";

export class MockStoreClient implements StoreClient {
  private readonly shouldFail: boolean;

  constructor(options?: { shouldFail?: boolean }) {
    this.shouldFail = options?.shouldFail ?? false;
  }

  async updateSystem(
    system: "crm" | "erp",
    contract: Contract,
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error(
        `Mock ${system.toUpperCase()} write failed`,
      );
    }

    console.log(
      `Mock write successful: ${system.toUpperCase()} totalContractValue=${contract.totalContractValue}`,
    );
  }
}
import type { Contract } from "../types/contract.js";
import type { ReviewResult } from "../review/review-session.js";
import type { StoreClient } from "./store-client.js";

export interface CorrectionResult {
  correctedContract: Contract;
  target: "crm" | "erp";
}

export async function applyCorrection(
  target: "crm" | "erp",
  sourceContract: Contract,
  review: ReviewResult,
  storeClient: StoreClient,
): Promise<CorrectionResult> {
  if (review.decision !== "approve") {
    throw new Error(
      "Correction cannot be applied without explicit approval",
    );
  }

  await storeClient.updateSystem(
    target,
    sourceContract,
  );

  return {
    correctedContract: sourceContract,
    target,
  };
}
import type { ReconciliationRun } from "../workflow/run-state.js";
import type { ReconciliationResult } from "../reconciliation/reconcile.js";

export interface ReviewItem {
  source: "crm" | "erp";
  field?: string;
  product?: string;
  differences: string[];
  reconciliation: ReconciliationResult;
}

export function buildReviewQueue(
  run: ReconciliationRun,
): ReviewItem[] {
  const items: ReviewItem[] = [];

  if (run.crmReconciliation?.status === "mismatch") {
    for (const mismatch of run.crmReconciliation.mismatches) {
      items.push({
        source: "crm",
        field: mismatch.field,
        product: mismatch.product,
        differences: mismatch.differences,
        reconciliation: run.crmReconciliation,
      });
    }
  }

  if (run.erpReconciliation?.status === "mismatch") {
    for (const mismatch of run.erpReconciliation.mismatches) {
      items.push({
        source: "erp",
        field: mismatch.field,
        product: mismatch.product,
        differences: mismatch.differences,
        reconciliation: run.erpReconciliation,
      });
    }
  }

  return items;
}
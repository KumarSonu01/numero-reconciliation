import type { Contract } from "../types/contract.js";
import { compareFields, type FieldComparison } from "../matching/field-matcher.js";
import {
  compareLineItems,
  type LineItemComparison,
} from "../matching/line-item-matcher.js";

export type ReconciliationStatus = "clean" | "mismatch";

export interface ReconciliationResult {
  status: ReconciliationStatus;
  fieldComparisons: FieldComparison[];
  lineItemComparisons: LineItemComparison[];
  mismatches: Array<{
    type: "field" | "line_item";
    field?: string;
    product?: string;
    differences: string[];
  }>;
}

export function reconcileContracts(
  source: Contract,
  target: Contract,
): ReconciliationResult {
  const fieldComparisons = compareFields(source, target);
  const lineItemComparisons = compareLineItems(
    source.lineItems,
    target.lineItems,
  );

  const mismatches: ReconciliationResult["mismatches"] = [];

  for (const comparison of fieldComparisons) {
    if (comparison.status === "mismatch") {
      mismatches.push({
        type: "field",
        field: comparison.field,
        differences: ["Source and target values differ"],
      });
    }
  }

  for (const comparison of lineItemComparisons) {
    if (comparison.status !== "match") {
      mismatches.push({
        type: "line_item",
        product: comparison.product,
        differences: comparison.differences,
      });
    }
  }

  return {
    status: mismatches.length === 0 ? "clean" : "mismatch",
    fieldComparisons,
    lineItemComparisons,
    mismatches,
  };
}

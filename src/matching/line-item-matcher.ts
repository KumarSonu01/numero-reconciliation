import type { ContractLineItem } from "../types/contract.js";

export type LineItemMatchStatus = "match" | "mismatch" | "missing";

export interface LineItemComparison {
  product: string;
  status: LineItemMatchStatus;
  source?: ContractLineItem;
  target?: ContractLineItem;
  differences: string[];
}

function normalizeProductName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

interface AggregatedLineItem {
  product: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  startDate?: string;
  endDate?: string;
}

function aggregateLineItems(
  items: ContractLineItem[],
): AggregatedLineItem[] {
  const groups = new Map<string, AggregatedLineItem>();

  for (const item of items) {
    const key = normalizeProductName(item.product);

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        startDate: item.startDate,
        endDate: item.endDate,
      });
      continue;
    }

    // Same product can be split across multiple rows.
    // Only aggregate rows that have the same commercial terms.
    if (
      existing.unitPrice !== item.unitPrice ||
      existing.discount !== item.discount ||
      existing.startDate !== item.startDate ||
      existing.endDate !== item.endDate
    ) {
      // Keep the conflicting row separate by using a unique key.
      const uniqueKey = `${key}::${groups.size}`;

      groups.set(uniqueKey, {
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        startDate: item.startDate,
        endDate: item.endDate,
      });

      continue;
    }

    existing.quantity += item.quantity;
  }

  return [...groups.values()];
}

export function compareLineItems(
  source: ContractLineItem[],
  target: ContractLineItem[],
): LineItemComparison[] {
  const sourceItems = aggregateLineItems(source);
  const targetItems = aggregateLineItems(target);

  const results: LineItemComparison[] = [];
  const matchedTargetIndexes = new Set<number>();

  for (const sourceItem of sourceItems) {
    const sourceProduct = normalizeProductName(sourceItem.product);

    const targetIndex = targetItems.findIndex(
      (targetItem, index) =>
        !matchedTargetIndexes.has(index) &&
        normalizeProductName(targetItem.product) === sourceProduct,
    );

    if (targetIndex === -1) {
      results.push({
        product: sourceItem.product,
        status: "missing",
        source: sourceItem,
        differences: ["Line item not found in target"],
      });
      continue;
    }

    matchedTargetIndexes.add(targetIndex);

    const targetItem = targetItems[targetIndex];
    const differences: string[] = [];

    if (sourceItem.quantity !== targetItem.quantity) {
      differences.push("quantity");
    }

    if (sourceItem.unitPrice !== targetItem.unitPrice) {
      differences.push("unitPrice");
    }

    if (sourceItem.discount !== targetItem.discount) {
      differences.push("discount");
    }

    if (sourceItem.startDate !== targetItem.startDate) {
      differences.push("startDate");
    }

    if (sourceItem.endDate !== targetItem.endDate) {
      differences.push("endDate");
    }

    results.push({
      product: sourceItem.product,
      status: differences.length === 0 ? "match" : "mismatch",
      source: sourceItem,
      target: targetItem,
      differences,
    });
  }

  for (let index = 0; index < targetItems.length; index++) {
    if (matchedTargetIndexes.has(index)) {
      continue;
    }

    results.push({
      product: targetItems[index].product,
      status: "missing",
      target: targetItems[index],
      differences: ["Line item not found in source"],
    });
  }

  return results;
}

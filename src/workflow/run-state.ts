import type { Contract } from "../types/contract.js";
import type { ReconciliationResult } from "../reconciliation/reconcile.js";

export type RunStatus =
  | "completed"
  | "awaiting_review"
  | "rejected"
  | "failed";

export interface ReconciliationRun {
  runId: string;
  fixturePath: string;
  status: RunStatus;

  document?: Contract;
  crm?: Contract;
  erp?: Contract;

  crmReconciliation?: ReconciliationResult;
  erpReconciliation?: ReconciliationResult;

  error?: string;

  createdAt: string;
  updatedAt: string;
}

import crypto from "node:crypto";
import path from "node:path";

import { loadBundle } from "../ingestion/bundle-loader.js";
import { extractPdfText } from "../extraction/pdf-extractor.js";
import { extractContractWithAI } from "../extraction/ai-extractor.js";
import { normalizeContract } from "../normalization/normalize-fields.js";
import { reconcileContracts } from "../reconciliation/reconcile.js";
import { startReviewSession } from "../review/review-session.js";
import { MockStoreClient } from "../writeback/mock-store.js";
import { applyCorrection } from "../writeback/correction-writer.js";
import { logAuditEvent } from "../audit/audit-log.js";
import { env } from "../config/env.js";

import type { ReconciliationRun } from "./run-state.js";

export async function runReconciliation(
  fixturePath: string,
): Promise<ReconciliationRun> {
  const now = new Date().toISOString();

  const run: ReconciliationRun = {
    runId: crypto.randomUUID(),
    fixturePath: path.resolve(fixturePath),
    status: "failed",
    createdAt: now,
    updatedAt: now,
  };

  await logAuditEvent(run.runId, "run_started", {
    fixturePath: run.fixturePath,
  });

  try {
    const bundle = await loadBundle(run.fixturePath);

    const pdfText = await extractPdfText(bundle.pdfPath);
    const document = await extractContractWithAI(pdfText);

    const normalizedDocument = normalizeContract(document);
    const normalizedCrm = normalizeContract(bundle.crm);
    const normalizedErp = normalizeContract(bundle.erp);

    run.document = normalizedDocument;
    run.crm = normalizedCrm;
    run.erp = normalizedErp;

    const crmReconciliation = reconcileContracts(
      normalizedDocument,
      normalizedCrm,
    );

    const erpReconciliation = reconcileContracts(
      normalizedDocument,
      normalizedErp,
    );

    run.crmReconciliation = crmReconciliation;
    run.erpReconciliation = erpReconciliation;

    await logAuditEvent(
      run.runId,
      "reconciliation_completed",
      {
        crmStatus: crmReconciliation.status,
        erpStatus: erpReconciliation.status,
        mismatchCount:
          crmReconciliation.mismatches.length +
          erpReconciliation.mismatches.length,
      },
    );

    const isClean =
      crmReconciliation.status === "clean" &&
      erpReconciliation.status === "clean";

    // Case 1: everything matches, so complete automatically.
    if (isClean) {
      run.status = "completed";
      run.updatedAt = new Date().toISOString();

      await logAuditEvent(run.runId, "run_completed", {
        reason: "All systems matched the document",
      });

      return run;
    }

    // Case 2+: mismatch requires explicit human review.
    run.status = "awaiting_review";
    run.updatedAt = new Date().toISOString();

    await logAuditEvent(run.runId, "review_requested", {
      crmMismatchCount: crmReconciliation.mismatches.length,
      erpMismatchCount: erpReconciliation.mismatches.length,
    });

    const review = await startReviewSession(run);

    await logAuditEvent(run.runId, "review_decision", {
      decision: review.decision,
      reviewer: review.reviewer,
      reason: review.reason,
    });

    console.log(
      `\nReview decision: ${review.decision.toUpperCase()}`,
    );
    console.log(`Reviewer: ${review.reviewer}`);

    if (review.reason) {
      console.log(`Reason: ${review.reason}`);
    }

    // Explicit rejection means no write-back.
    if (review.decision === "reject") {
      run.status = "rejected";
      run.updatedAt = new Date().toISOString();

      await logAuditEvent(run.runId, "run_rejected", {
        reviewer: review.reviewer,
        reason: review.reason,
      });

      return run;
    }

    // For the current workflow, correct whichever system is mismatching.
    const target =
      erpReconciliation.status === "mismatch"
        ? "erp"
        : "crm";

    // The mock store can now be configured to fail through
    // MOCK_WRITE_FAILURE=true.
    const storeClient = new MockStoreClient({
      shouldFail: env.mockWriteFailure,
    });

    await logAuditEvent(run.runId, "writeback_attempted", {
      target,
      reviewer: review.reviewer,
    });

    try {
      await applyCorrection(
        target,
        normalizedDocument,
        review,
        storeClient,
      );

      await logAuditEvent(run.runId, "writeback_succeeded", {
        target,
        totalContractValue:
          normalizedDocument.totalContractValue,
      });
    } catch (error) {
      await logAuditEvent(run.runId, "writeback_failed", {
        target,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });

      throw error;
    }

    // Write-back succeeded after explicit human approval.
    run.status = "completed";
    run.updatedAt = new Date().toISOString();

    await logAuditEvent(run.runId, "run_completed", {
      reason: "Human-approved correction written successfully",
      target,
    });

    return run;
  } catch (error) {
    run.status = "failed";
    run.error =
      error instanceof Error
        ? error.message
        : String(error);

    run.updatedAt = new Date().toISOString();

    await logAuditEvent(run.runId, "run_failed", {
      error: run.error,
    });

    return run;
  }
}
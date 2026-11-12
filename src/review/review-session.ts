import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import type { ReconciliationRun } from "../workflow/run-state.js";
import { buildReviewQueue } from "./review-queue.js";

export type ReviewDecision = "approve" | "reject";

export interface ReviewResult {
  decision: ReviewDecision;
  reviewer: string;
  reason?: string;
}

export async function startReviewSession(
  run: ReconciliationRun,
): Promise<ReviewResult> {
  const queue = buildReviewQueue(run);

  if (queue.length === 0) {
    throw new Error("Cannot start review session: review queue is empty");
  }

  console.log("\n========================================");
  console.log(" RECONCILIATION REVIEW REQUIRED");
  console.log("========================================\n");

  console.log(`Run ID: ${run.runId}`);
  console.log(`Fixture: ${run.fixturePath}\n`);

  for (const [index, item] of queue.entries()) {
    console.log(`Mismatch ${index + 1}`);
    console.log(`System: ${item.source.toUpperCase()}`);

    if (item.field) {
      console.log(`Field: ${item.field}`);
    }

    if (item.product) {
      console.log(`Product: ${item.product}`);
    }

    for (const difference of item.differences) {
      console.log(`Difference: ${difference}`);
    }

    console.log("");
  }

  const rl = readline.createInterface({ input, output });

  try {
    const reviewer = (
      await rl.question("Reviewer name: ")
    ).trim();

    if (!reviewer) {
      throw new Error("Reviewer name is required");
    }

    const answer = (
      await rl.question(
        "Decision [approve/reject]: ",
      )
    )
      .trim()
      .toLowerCase();

    if (answer !== "approve" && answer !== "reject") {
      throw new Error(
        "Invalid decision. Expected 'approve' or 'reject'.",
      );
    }

    let reason: string | undefined;

    if (answer === "reject") {
      reason = (
        await rl.question("Reason for rejection: ")
      ).trim();

      if (!reason) {
        throw new Error("Rejection reason is required");
      }
    }

    return {
      decision: answer,
      reviewer,
      reason,
    };
  } finally {
    rl.close();
  }
}
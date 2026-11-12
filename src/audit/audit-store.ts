import fs from "node:fs/promises";
import path from "node:path";

export interface AuditEvent {
  timestamp: string;
  runId: string;
  event:
    | "run_started"
    | "reconciliation_completed"
    | "review_requested"
    | "review_decision"
    | "writeback_attempted"
    | "writeback_succeeded"
    | "writeback_failed"
    | "run_completed"
    | "run_rejected"
    | "run_failed";
  details?: Record<string, unknown>;
}

export class AuditStore {
  private readonly filePath: string;

  constructor(filePath = "data/audit/reconciliation.jsonl") {
    this.filePath = path.resolve(filePath);
  }

  async append(event: AuditEvent): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), {
      recursive: true,
    });

    await fs.appendFile(
      this.filePath,
      `${JSON.stringify(event)}\n`,
      "utf8",
    );
  }
}

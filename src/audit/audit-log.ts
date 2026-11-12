import { AuditStore, type AuditEvent } from "./audit-store.js";

const auditStore = new AuditStore();

export async function logAuditEvent(
  runId: string,
  event: AuditEvent["event"],
  details?: Record<string, unknown>,
): Promise<void> {
  await auditStore.append({
    timestamp: new Date().toISOString(),
    runId,
    event,
    details,
  });
}

# Numero Take-Home — Design Note

## 1. Architecture

The system is implemented as a single-process TypeScript CLI pipeline:

**PDF + CRM JSON + ERP JSON → Extraction → Normalization → Reconciliation → Human Review → Optional Write-back → Audit**

The PDF is treated as the authoritative contract source. CRM and ERP records are loaded through separate adapters and converted into the same canonical `Contract` model. This keeps source-specific formats isolated from reconciliation logic.

The workflow is intentionally sequential. A run receives one fixture bundle, generates a run ID, performs extraction and reconciliation, and then either completes automatically or transitions to `awaiting_review`.

The main boundaries are:

- **Extraction:** PDF text extraction and AI-assisted semantic extraction.
- **Adapters:** CRM and ERP JSON → canonical contract.
- **Normalization:** Dates, money, currencies, payment terms, and semantic names are normalized before comparison.
- **Reconciliation:** Field-level and line-item comparisons produce explicit mismatches.
- **Review:** Mismatches become review items and require an explicit human decision.
- **Write-back:** Updates go through a `StoreClient` interface rather than directly modifying source files.
- **Audit:** Every significant state transition is appended to a JSONL audit log.

## 2. AI Usage

AI is used for a meaningful part of the running extraction pipeline rather than as a decorative or unused integration.

The local Ollama model (`qwen2.5:3b`) receives a bounded extraction context from the PDF and extracts semantic information such as the customer name, quote ID, currency, total value, and product names.

The AI output is not blindly trusted. The implementation independently parses deterministic fields from the PDF and validates the AI result against those values. If the AI produces a conflicting quote ID, currency, total, or product set, the extraction fails instead of silently accepting potentially incorrect data.

This creates a deliberate division of responsibility:

- **AI:** semantic interpretation of document content.
- **Deterministic parsing:** exact structured values where reliable patterns exist.
- **Validation:** prevents an incorrect AI response from becoming contract truth.

The system also detects documents where extraction is structurally impossible, such as a blank/silent PDF or unreadable garbage text, and fails with a controlled error.

## 3. Reconciliation Strategy

All three sources are represented using the same canonical contract model. Comparisons therefore operate on normalized values rather than raw source representations.

Examples include:

- `June 5 2025` → `2025-06-05`
- `$165000.00` → `165000`
- `Net 30` and `30 days from invoice date` → `net 30`
- `$` / `USD` → `USD`
- `Acme Corporation` and `ACME Corp.` → equivalent company names

Contract-level fields are compared individually, while subscription line items are matched using normalized product names and commercial attributes.

Line-item count differences are not automatically treated as errors. The matcher can aggregate compatible rows, allowing a system representation such as two separate Cyber Insurance rows to reconcile against a single document line with the equivalent quantity.

The output explicitly identifies whether the run is clean or mismatched and records the affected field/product and differences.

## 4. Human-in-the-Loop and State Management

A clean reconciliation automatically completes.

A genuine mismatch transitions the run to:

`awaiting_review`

The workflow then presents the analyst with the conflicting values and requires an explicit:

- **Approve** decision, or
- **Reject** decision with a reason.

A rejected run ends in `rejected` and performs no write-back.

An approved run may proceed to corrective write-back. There is no automatic retry that can bypass the human decision.

This state-oriented design is important because reconciliation is not merely a comparison problem: the system must stop safely when contract truth and system state disagree.

## 5. Corrective Write-back

Write-back is deliberately separated behind:

`StoreClient.updateSystem(system, contract)`

The current implementation uses `MockStoreClient`, which provides two useful behaviors:

1. Successful write-back.
2. Configurable write failure through `MOCK_WRITE_FAILURE=true`.

The mock store does not mutate the fixture files. This keeps the demonstration deterministic while still exercising the complete approval → write-back → success/failure workflow.

Write-back is only attempted after explicit human approval. A failed write transitions the run to `failed` and records the failure in the audit trail.

## 6. Auditability and Failure Handling

Each run receives a unique ID and records events such as:

- `run_started`
- `reconciliation_completed`
- `review_requested`
- `review_decision`
- `writeback_attempted`
- `writeback_succeeded`
- `writeback_failed`
- `run_completed`
- `run_rejected`
- `run_failed`

This makes the decision path observable without requiring a database for the take-home implementation.

The implementation also distinguishes between reconciliation mismatches and extraction/system failures. A mismatch is a business decision requiring review; an unreadable document, invalid extraction, or failed write is an operational failure.

## 7. Key Trade-offs

The implementation intentionally favors correctness and demonstrability over production-scale infrastructure.

**Local CLI instead of services:**  
The assignment requires a single-process local system, so a CLI keeps deployment and demonstration simple.

**JSONL audit log instead of a database:**  
This is sufficient for a local take-home and keeps the audit trail inspectable. A production system would likely use durable transactional storage.

**Mock write client instead of real CRM/ERP APIs:**  
The assignment explicitly provides mock stores and requires failure behavior. The client interface makes replacing the mock with real integrations straightforward.

**Small local AI model instead of a hosted LLM:**  
This avoids external credentials and keeps the system reproducible locally. The trade-off is weaker extraction quality compared with larger production models.

**Fail closed on AI disagreement:**  
When AI output conflicts with deterministic document parsing, the system fails rather than guessing. This is preferable for contract reconciliation because silently accepting incorrect financial or contractual data is more dangerous than requiring manual intervention.

## 8. Current Scope and Limitations

The implementation is intentionally scoped to the supplied fixture formats and supported contract fields. It does not integrate with live Salesforce/ERP APIs, persist state in a database, or perform real external writes.

The document parser assumes the supplied order-form structure and currently relies on extractable PDF text. A production implementation would need stronger OCR support, broader document-template handling, durable workflow state, authentication/authorization, retry policies, and real integration clients.

Within the take-home scope, the important workflow is complete: **extract → normalize → reconcile → pause for human decision when necessary → safely write back only after approval → audit the outcome.**
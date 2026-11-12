# Numero Take-Home — Document ↔ Systems Reconciliation

A local, single-process reconciliation workflow that treats the signed order form PDF as the legal source of truth and compares it against CRM and ERP records.

The workflow uses a local AI model for semantic document extraction, deterministic normalization and reconciliation, human review for genuine mismatches, and an explicit mock write-back boundary.

## Requirements

- Node.js 20+
- pnpm
- Ollama
- Local Ollama model: `qwen2.5:3b`

The application expects Ollama to be available at:

```text
http://localhost:11434
```

Install the model if it is not already available:

```powershell
ollama pull qwen2.5:3b
```

## Setup

Install dependencies:

```powershell
pnpm install
```

Create `.env` from `.env.example` if needed.

The optional write-back failure switch is:

```env
MOCK_WRITE_FAILURE=false
```

## Run

Run reconciliation against a fixture:

```powershell
pnpm recon fixtures/01-clean
```

The CLI accepts exactly one fixture directory containing:

```text
crm.json
erp.json
order-form.pdf
```

The program prints the complete reconciliation run as JSON.

## Workflow

The pipeline is:

```text
PDF + CRM JSON + ERP JSON
            │
            ▼
      Bundle loading
            │
            ▼
      PDF text extraction
            │
            ▼
   Local AI semantic extraction
            │
            ▼
 Deterministic PDF field parsing
            │
            ▼
       Normalization
            │
            ▼
 Document ↔ CRM reconciliation
 Document ↔ ERP reconciliation
            │
       ┌────┴────┐
       │         │
     clean    mismatch
       │         │
       ▼         ▼
   complete   human review
                 │
           ┌─────┴─────┐
           │           │
        reject       approve
           │           │
           ▼           ▼
       rejected     mock write-back
                         │
                    completed/failed
```

### Clean case

When both CRM and ERP match the document after normalization:

- the run completes automatically;
- no human review is requested;
- no write-back occurs;
- the result is marked `completed`.

Case 1 demonstrates this behavior. The clean run extracts quote `Q-00041`, identifies the contract total as `$165,000`, and reconciles both systems successfully.

### Mismatch case

When a genuine mismatch is detected:

1. the run enters `awaiting_review`;
2. the reviewer sees the mismatched fields;
3. the reviewer can approve or reject;
4. rejection ends the run without write-back;
5. approval explicitly authorizes corrective write-back.

The workflow does not silently modify CRM or ERP data.

## AI Usage

AI is used during PDF extraction through a local Ollama model:

```text
qwen2.5:3b
```

The AI performs semantic extraction of document information such as:

- quote ID
- customer name
- currency
- contract total
- product names

The implementation deliberately does not rely on the model for all financial correctness.

Structured values are additionally parsed deterministically from the extracted PDF text and validated against the AI response. This prevents a hallucinated total or quote ID from becoming an authoritative value.

The PDF is treated as the source of truth.

## Reconciliation

The system compares:

- customer name
- contract currency
- total contract value
- payment terms
- contract start date
- contract end date
- signature date
- quote ID
- bill-to address
- ship-to address
- subscription line items

Normalization handles expected representation differences including:

- date formats
- monetary formatting
- currency symbols
- payment-term wording
- company-name variants

For example, equivalent company names such as:

```text
Acme Corporation
ACME Corp.
```

can be treated as the same company during reconciliation.

Line-item matching also supports split/bundled representations where quantities for the same product are distributed across multiple target rows.

Different line-item counts alone are therefore not automatically treated as an error.

## Human Review

Human review is intentionally terminal until a decision is made.

A mismatch does not automatically resume processing.

The reviewer must explicitly choose:

```text
approve
```

or:

```text
reject
```

A rejection requires a reason and ends the run as:

```text
rejected
```

An approval authorizes the corrective write-back attempt.

## Write-back

The application uses a `StoreClient` interface rather than directly mutating fixture JSON.

The current implementation provides:

```text
MockStoreClient
```

This keeps the write boundary explicit and allows the write operation to be forced to fail.

To simulate a write-back failure:

```powershell
$env:MOCK_WRITE_FAILURE="true"
pnpm recon fixtures/02-tcv-mismatch
```

After testing:

```powershell
$env:MOCK_WRITE_FAILURE="false"
```

A write failure results in a failed run and is recorded in the audit log.

The mock client intentionally does not modify the fixture JSON files. A corrected fixture can therefore be rerun independently.

## Audit Log

Reconciliation events are written as JSON Lines under:

```text
data/audit/reconciliation.jsonl
```

The audit log records events including:

- run started
- reconciliation completed
- review requested
- review decision
- write-back attempted
- write-back succeeded
- write-back failed
- run completed
- run rejected
- run failed

Runtime audit logs are ignored by Git.

## Fixtures

The repository contains the following scenarios:

| Fixture | Scenario |
|---|---|
| `01-clean` | Clean reconciliation |
| `02-tcv-mismatch` | Total contract value mismatch |
| `03-dates` | Date representation differences |
| `04-amount-encoding` | Monetary representation differences |
| `05-line-items` | Split/bundled line items |
| `06-payment-terms` | Payment-term representation differences |
| `07-wrong-bundle` | Incorrect quote/bundle |
| `08-silent-document` | Document with no usable contract data |
| `09-bad-scan` | Structurally invalid/unreadable document |
| `10-rerun` | Corrected data followed by rerun |
| `11-currency` | Currency mismatch |
| `12-naming` | Company-name representation difference |

Run any fixture with:

```powershell
pnpm recon fixtures/<fixture-name>
```

Fixtures that contain genuine mismatches intentionally pause for human review.

## Tests

Run the automated test suite:

```powershell
pnpm test
```

Run TypeScript type checking:

```powershell
pnpm typecheck
```

The current test suite covers field matching, line-item matching, normalization, reconciliation, and workflow behavior.

## Project Structure

```text
src/
├── audit/
│   ├── audit-log.ts
│   └── audit-store.ts
├── cli/
│   └── recon.ts
├── config/
│   └── env.ts
├── extraction/
│   ├── ai-extractor.ts
│   ├── extraction-context.ts
│   ├── extraction-schema.ts
│   ├── pdf-contract-parser.ts
│   └── pdf-extractor.ts
├── ingestion/
│   ├── bundle-loader.ts
│   ├── crm-loader.ts
│   ├── erp-loader.ts
│   └── pdf-loader.ts
├── matching/
│   ├── field-matcher.ts
│   └── line-item-matcher.ts
├── normalization/
│   ├── normalize-currency.ts
│   ├── normalize-date.ts
│   ├── normalize-fields.ts
│   ├── normalize-money.ts
│   └── normalize-terms.ts
├── reconciliation/
│   └── reconcile.ts
├── review/
│   ├── review-queue.ts
│   ├── review-session.ts
│   └── terminal-ui.ts
├── types/
│   ├── audit.ts
│   ├── contract.ts
│   ├── reconciliation.ts
│   ├── review.ts
│   └── source.ts
├── utils/
│   ├── errors.ts
│   ├── file-utils.ts
│   └── logger.ts
├── workflow/
│   ├── run-reconciliation.ts
│   └── run-state.ts
└── writeback/
    ├── correction-writer.ts
    ├── mock-store.ts
    └── store-client.ts
```

## Design Principles

### PDF is authoritative

CRM and ERP records are treated as potentially stale or incorrect. The signed order form is the source of truth.

### AI is bounded

AI handles semantic extraction, while deterministic parsing and validation protect critical structured values.

### Normalization precedes comparison

Equivalent representations should not create false mismatches.

### Human approval is mandatory for correction

A detected mismatch cannot silently modify downstream
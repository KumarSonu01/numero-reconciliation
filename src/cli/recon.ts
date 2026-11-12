import { runReconciliation } from "../workflow/run-reconciliation.js";

const fixturePath = process.argv[2];

if (!fixturePath) {
  console.error(
    "Usage: pnpm recon <fixture-path>",
  );
  process.exit(1);
}

const run = await runReconciliation(fixturePath);

console.log(
  JSON.stringify(run, null, 2),
);
/**
 * Reads coverage/*/coverage-summary.json files produced by Jest
 * and fails CI if any project's statement coverage is below the threshold.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const THRESHOLD = 80;
const coverageRoot = 'coverage';

if (!existsSync(coverageRoot)) {
  process.stdout.write('No coverage directory found — skipping threshold check.\n');
  process.exit(0);
}

let failed = false;

for (const entry of readdirSync(coverageRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const summaryPath = join(coverageRoot, entry.name, 'coverage-summary.json');

  if (!existsSync(summaryPath)) continue;

  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const stmts = summary.total?.statements?.pct ?? 0;
  const branches = summary.total?.branches?.pct ?? 0;

  const status = stmts >= THRESHOLD && branches >= THRESHOLD ? '✓' : '✗';

  process.stdout.write(
    `${status} ${entry.name}: statements ${String(stmts)}%, branches ${String(branches)}%\n`,
  );

  if (stmts < THRESHOLD || branches < THRESHOLD) {
    failed = true;
  }
}

if (failed) {
  process.stderr.write(
    `\nCoverage below ${String(THRESHOLD)}% threshold. See details above.\n`,
  );
  process.exit(1);
}

process.stdout.write(`\nAll projects meet ${String(THRESHOLD)}% coverage threshold.\n`);

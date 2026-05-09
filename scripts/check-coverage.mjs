// Reads coverage/**/coverage-summary.json files produced by Jest
// and fails CI if any project's statement coverage is below the threshold.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const THRESHOLD = 80;
const coverageRoot = 'coverage';

if (!existsSync(coverageRoot)) {
  process.stdout.write('No coverage directory found — skipping threshold check.\n');
  process.exit(0);
}

let failed = false;
let found = 0;

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.name === 'coverage-summary.json') {
      results.push(full);
    }
  }
  return results;
}

for (const summaryPath of walk(coverageRoot)) {
  found++;
  const projectDir = relative(coverageRoot, join(summaryPath, '..'));
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const stmts = summary.total?.statements?.pct ?? 0;
  const branches = summary.total?.branches?.pct ?? 0;

  const status = stmts >= THRESHOLD && branches >= THRESHOLD ? '✓' : '✗';

  process.stdout.write(
    `${status} ${projectDir}: statements ${String(stmts)}%, branches ${String(branches)}%\n`,
  );

  if (stmts < THRESHOLD || branches < THRESHOLD) {
    failed = true;
  }
}

if (found === 0) {
  process.stdout.write('No coverage-summary.json files found — skipping threshold check.\n');
  process.exit(0);
}

if (failed) {
  process.stderr.write(
    `\nCoverage below ${String(THRESHOLD)}% threshold. See details above.\n`,
  );
  process.exit(1);
}

process.stdout.write(`\nAll ${String(found)} projects meet ${String(THRESHOLD)}% coverage threshold.\n`);

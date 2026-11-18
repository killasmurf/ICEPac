import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

/** Start every run with empty diagnostics/findings files (Playwright restarts the worker after a failure, so they are appended on disk). */
export default function globalSetup() {
  const out = path.resolve(process.cwd(), 'e2e-real', '__screenshots__');
  mkdirSync(out, { recursive: true });
  for (const f of ['diagnostics.jsonl', 'diagnostics-summary.json', 'findings-data.json']) rmSync(path.join(out, f), { force: true });
}

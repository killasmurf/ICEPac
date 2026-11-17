#!/usr/bin/env node
// Bundle budget: measures the gzipped size of the JavaScript the browser loads eagerly on first visit
// (the entry script and the chunks `build/index.html` modulepreloads), not the lazy route chunks.
// Fails when the total exceeds the budget, or when the data grid or charts library ended up in it.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 350;
/** Strings that only appear in these heavy libraries; they must stay in lazy chunks. */
const FORBIDDEN = [
  { marker: 'MuiDataGrid-cell', name: '@mui/x-data-grid' },
  { marker: 'MuiChartsLayerContainer', name: '@mui/x-charts' },
];

const buildDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'build');
const indexFile = join(buildDir, 'index.html');
if (!existsSync(indexFile)) {
  console.error('bundle-budget: build/index.html not found; run `npm run build` first.');
  process.exit(2);
}

const html = readFileSync(indexFile, 'utf8');
const refs = new Set();
for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
  const isEntry = /^<script\b/.test(tag) && /type="module"/.test(tag);
  const isPreload = /^<link\b/.test(tag) && /rel="modulepreload"/.test(tag);
  if (!isEntry && !isPreload) continue;
  const ref = tag.match(/\b(?:src|href)="([^"]+)"/)?.[1];
  if (ref) refs.add(ref.replace(/^\//, ''));
}
if (refs.size === 0) {
  console.error('bundle-budget: no entry script found in build/index.html.');
  process.exit(2);
}

let total = 0;
const problems = [];
console.log('Entry chunks (gzip):');
for (const ref of refs) {
  const source = readFileSync(join(buildDir, ref));
  const gz = gzipSync(source, { level: 9 }).length;
  total += gz;
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} kB  ${ref}`);
  const text = source.toString('utf8');
  for (const { marker, name } of FORBIDDEN) {
    if (text.includes(marker)) problems.push(`${name} is in the entry chunk ${ref}; import it lazily.`);
  }
}
const totalKb = total / 1024;
console.log(`Total: ${totalKb.toFixed(1)} kB gzip (budget ${BUDGET_KB} kB)`);
if (totalKb > BUDGET_KB) problems.push(`Entry JavaScript is ${totalKb.toFixed(1)} kB gzip, over the ${BUDGET_KB} kB budget.`);

if (problems.length > 0) {
  for (const p of problems) console.error(`bundle-budget: ${p}`);
  process.exit(1);
}
console.log('bundle-budget: OK (data grid and charts are not in the entry chunks)');

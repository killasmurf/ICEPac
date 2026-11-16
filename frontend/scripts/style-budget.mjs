#!/usr/bin/env node
// Style budget: counts inline styles, hardcoded hex colours and emoji in src/.
// Fails if any count exceeds style-budget.json. `--write` stores the current counts.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const budgetFile = join(root, 'style-budget.json');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function isCounted(file) {
  const rel = relative(srcDir, file).split(sep).join('/');
  if (!/\.(ts|tsx)$/.test(rel)) return false;
  if (rel.startsWith('theme/')) return false;
  if (/\.test\.[^/]+$/.test(rel)) return false;
  return true;
}

const counts = { inlineStyle: 0, hex: 0, emoji: 0 };
for (const file of walk(srcDir)) {
  if (!isCounted(file)) continue;
  const text = readFileSync(file, 'utf8');
  counts.inlineStyle += (text.match(/style=\{/g) ?? []).length;
  counts.hex += (text.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).length;
  counts.emoji += (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
}

console.log(`style budget: inlineStyle=${counts.inlineStyle} hex=${counts.hex} emoji=${counts.emoji}`);

if (process.argv.includes('--write')) {
  writeFileSync(budgetFile, JSON.stringify(counts, null, 2) + '\n');
  console.log(`wrote ${relative(root, budgetFile)}`);
  process.exit(0);
}

if (!existsSync(budgetFile)) {
  console.error('style-budget.json is missing. Run: node scripts/style-budget.mjs --write');
  process.exit(1);
}

const budget = JSON.parse(readFileSync(budgetFile, 'utf8'));
let failed = false;
for (const key of Object.keys(counts)) {
  if (counts[key] > budget[key]) {
    console.error(`  ${key} rose: ${counts[key]} > budget ${budget[key]}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);

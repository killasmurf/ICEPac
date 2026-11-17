import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** Load a JSON fixture from e2e/fixtures/data. */
export function loadFixture<T = unknown>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T;
}

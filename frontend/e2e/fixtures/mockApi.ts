import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

export type Role = 'admin' | 'manager' | 'user' | 'viewer';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** Load a JSON fixture from e2e/fixtures/data. */
export function loadFixture<T = unknown>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T;
}

type Handler = unknown | ((url: URL, method: string) => unknown);

/**
 * Routes the mock API answers, keyed by "METHOD /path" (path relative to /api/v1).
 * Add an entry here (and a JSON file under data/) when a screen needs a new endpoint.
 */
const routes: Record<string, Handler> = {
  'GET /projects': () => loadFixture('projects'),
  'GET /help/topics': () => loadFixture('help-topics'),
  'GET /auth/me': () => loadFixture('auth-me'),
  'POST /auth/login': () => ({ access_token: fakeJwt('admin'), refresh_token: fakeJwt('admin'), token_type: 'bearer' }),
  'GET /projects/1': () => (loadFixture<{ items: unknown[] }>('projects').items[0]),
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export interface MockApiHandle {
  /** Requests that had no mock. Specs must assert this is empty in an afterEach. */
  unmatched: string[];
}

/**
 * Intercept every API call and answer from fixtures. Unmatched requests get a 404
 * and are recorded in `unmatched` so a missing mock fails the test instead of hiding.
 */
export async function mockApi(page: Page, extra: Record<string, Handler> = {}): Promise<MockApiHandle> {
  const handle: MockApiHandle = { unmatched: [] };
  const table = { ...routes, ...extra };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    const url = new URL(request.url());
    const apiPath = url.pathname.replace(/^.*\/api\/v1/, '') || '/';
    const handler = table[`${method} ${apiPath}`];

    if (handler === undefined) {
      handle.unmatched.push(`${method} ${apiPath}`);
      await route.fulfill({
        status: 404,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ detail: `No mock for ${method} ${apiPath}` }),
      });
      return;
    }

    const body = typeof handler === 'function' ? handler(url, method) : handler;
    await route.fulfill({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  return handle;
}

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Build an unsigned JWT-shaped token (the frontend never verifies it). */
export function fakeJwt(role: Role): string {
  const header = base64url({ alg: 'none', typ: 'JWT' });
  const payload = base64url({ sub: '1', role, exp: 4102444800 }); // 2100-01-01
  return `${header}.${payload}.`;
}

/** Seed localStorage with a fake token before any page script runs. */
export async function loginAs(page: Page, role: Role = 'admin'): Promise<void> {
  const token = fakeJwt(role);
  await page.addInitScript((t) => {
    window.localStorage.setItem('access_token', t);
    window.localStorage.setItem('refresh_token', t);
  }, token);
}

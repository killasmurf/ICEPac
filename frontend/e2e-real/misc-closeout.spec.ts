/**
 * Real-API checks for the misc close-out: every catalogue report has a dedicated route that matches
 * /reports/generate, and an open risk form survives crossing the md breakpoint. Needs a freshly seeded
 * database (scripts/seed_smoke.py --reset); see docs/REAL_API_SMOKE.md.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SEED = JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'scripts', 'seed_smoke_data.json'), 'utf8'));
const API = process.env.SMOKE_API_URL ?? 'http://localhost:8010/api/v1';
const ADMIN = SEED.users.find((u: { role: string }) => u.role === 'admin');
const HARBOUR: string = SEED.projects.find((p: { key: string }) => p.key === 'harbour').name;

const NEW_ROUTES = [
  ['cost_by_region', 'cost-by-region'],
  ['boe_by_wbs', 'boe-by-wbs'],
  ['approver_activity', 'approver-activity'],
  ['resource_utilization', 'resource-utilization'],
  ['project_summary', 'project-summary'],
] as const;

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(ADMIN.username);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

async function token(page: Page): Promise<string> {
  const t = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(t).toBeTruthy();
  return t as string;
}

async function harbourId(page: Page): Promise<number> {
  const res = await page.request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${await token(page)}` } });
  const p = (await res.json()).items.find((i: { project_name: string }) => i.project_name === HARBOUR);
  expect(p).toBeTruthy();
  return p.id;
}

test('the five new report routes return what /reports/generate returns', async ({ page }) => {
  await login(page);
  const headers = { Authorization: `Bearer ${await token(page)}` };
  const id = await harbourId(page);
  for (const [type, route] of NEW_ROUTES) {
    const data = { report_type: type, filters: { project_id: id } };
    const generated = await page.request.post(`${API}/reports/generate`, { headers, data });
    const dedicated = await page.request.post(`${API}/reports/${route}`, { headers, data });
    expect(generated.status(), type).toBe(200);
    expect(dedicated.status(), route).toBe(200);
    const [g, d] = [await generated.json(), await dedicated.json()];
    expect(d.report_type).toBe(type);
    expect(d.columns).toEqual(g.columns);
    expect(d.rows).toEqual(g.rows);
    expect(d.totals).toEqual(g.totals);
  }
});

test('an open WBS risk form keeps its typed values across the md breakpoint and saves them', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await harbourId(page);
  await page.goto(`/projects/${id}`);
  await expect(page.getByRole('region', { name: 'Project summary' })).toBeVisible();
  const tree = page.getByRole('tree', { name: 'Work breakdown structure' });
  await expect(tree.getByRole('treeitem').first()).toBeVisible();
  for (let i = 0; i < 20; i++) {
    const collapsed = tree.locator('[role="treeitem"][aria-expanded="false"]');
    if ((await collapsed.count()) === 0) break;
    await collapsed.first().locator('span[aria-hidden="true"]').first().click();
  }
  await tree.getByRole('treeitem').filter({ hasText: /^1\.2\.1/ }).filter({ hasText: 'Structural Design' }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Structural Design' })).toBeVisible();
  await page.getByRole('tablist', { name: 'WBS details' }).getByRole('tab', { name: 'Risks' }).click();
  await page.getByRole('button', { name: 'Add Risk' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New Risk' });
  await dialog.getByLabel('Title').fill('Rotation risk');
  await dialog.getByRole('combobox', { name: /Risk Category/ }).click();
  await page.getByRole('option', { name: /^TECH/ }).click();
  await dialog.getByLabel('Risk Cost').fill('4321');

  for (const size of [{ width: 800, height: 1100 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Title')).toHaveValue('Rotation risk');
    await expect(dialog.getByLabel('Risk Cost')).toHaveValue('4321');
    await expect(dialog.getByRole('combobox', { name: /Risk Category/ })).toContainText('TECH');
    await expect(page.locator('#wbs-tab-1')).toHaveAttribute('aria-selected', 'true');
  }

  const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/wbs\/\d+\/risks$/.test(r.url()));
  await dialog.getByRole('button', { name: 'Create' }).click();
  const response = await posted;
  expect(response.status()).toBe(201);
  await expect(page.getByText('Risk created')).toBeVisible();

  const headers = { Authorization: `Bearer ${await token(page)}` };
  const listUrl = response.url();
  const risks = await (await page.request.get(listUrl, { headers })).json();
  const items = Array.isArray(risks) ? risks : risks.items;
  const created = items.find((r: { title: string }) => r.title === 'Rotation risk');
  expect(created, 'risk created with the typed title').toBeTruthy();
  expect(Number(created.risk_cost)).toBe(4321);
  expect(created.risk_category_code).toBe('TECH');
});

/**
 * Real-API checks for the admin close-out: server-side user search, filters and sorting, server-side
 * self-protection, and the default supplier on resources (Resources page and assignment pre-fill).
 * No mocks. Needs a freshly seeded database (scripts/seed_smoke.py --reset); see docs/REAL_API_SMOKE.md.
 * It undoes what it changes (the resource's supplier, the assignment it adds) so smoke.spec.ts still passes after it.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SEED = JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'scripts', 'seed_smoke_data.json'), 'utf8'));
const API = process.env.SMOKE_API_URL ?? 'http://localhost:8010/api/v1';
const admin = SEED.users.find((u: { role: string }) => u.role === 'admin');
const depot = SEED.projects.find((p: { key: string }) => p.key === 'depot');
const RESOURCE = 'IT-DEV'; // seeded without a default supplier
const SUPPLIER = SEED.suppliers.find((s: { code: string }) => s.code === 'CRN-03');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(admin.username);
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

async function headers(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(token, 'access_token in localStorage').toBeTruthy();
  return { Authorization: `Bearer ${token}` };
}

const usernamesInTable = async (page: Page) =>
  (await page.getByRole('grid', { name: 'Users' }).locator('[role="row"] [data-field="username"]').allTextContents()).map((t) => t.trim()).filter((t) => t && t !== 'Username');

test('users: search by part of an email goes to the server and the URL', async ({ page }) => {
  await login(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('grid', { name: 'Users' })).toContainText('smoke_user');
  const req = page.waitForRequest((r) => r.url().includes('/api/v1/admin/users?') && r.url().includes('search='));
  await page.getByLabel('Search users').fill('MANAGER@exam');
  expect(new URL((await req).url()).searchParams.get('search')).toBe('MANAGER@exam');
  await expect.poll(() => usernamesInTable(page)).toEqual(['smoke_manager']);
  await expect(page).toHaveURL(/[?&]q=MANAGER%40exam/);
  await expect(page.getByText(/1.*1 of 1/)).toBeVisible();
});

test('users: filter by role', async ({ page }) => {
  await login(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('grid', { name: 'Users' })).toContainText('smoke_user');
  const req = page.waitForResponse((r) => r.url().includes('/api/v1/admin/users?') && r.url().includes('role=admin'));
  await page.getByRole('combobox', { name: 'Role' }).click();
  await page.getByRole('option', { name: 'Admin' }).click();
  const body = await (await req).json();
  expect(body.total).toBe(1);
  await expect.poll(() => usernamesInTable(page)).toEqual(['smoke_admin']);
  await expect(page).toHaveURL(/[?&]role=admin/);
});

test('users: sort by username ascending and descending', async ({ page }) => {
  await login(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('grid', { name: 'Users' })).toContainText('smoke_user');
  const header = page.getByRole('columnheader', { name: 'Username' });
  // Username is hidden below sm only; the desktop grid has the column.
  const asc = page.waitForResponse((r) => r.url().includes('sort=username') && r.url().includes('/api/v1/admin/users?'));
  await header.click();
  const ascBody = await (await asc).json();
  expect(ascBody.items.map((u: { username: string }) => u.username)).toEqual(['smoke_admin', 'smoke_manager', 'smoke_user']);
  await expect.poll(() => usernamesInTable(page)).toEqual(['smoke_admin', 'smoke_manager', 'smoke_user']);

  const desc = page.waitForResponse((r) => r.url().includes('order=desc') && r.url().includes('/api/v1/admin/users?'));
  await header.click();
  const descBody = await (await desc).json();
  expect(descBody.items.map((u: { username: string }) => u.username)).toEqual(['smoke_user', 'smoke_manager', 'smoke_admin']);
  await expect.poll(() => usernamesInTable(page)).toEqual(['smoke_user', 'smoke_manager', 'smoke_admin']);
  await expect(page).toHaveURL(/sort=username.*order=desc/);
});

test('users: the API rejects unknown sort and role values with 422', async ({ page }) => {
  await login(page);
  const h = await headers(page);
  expect((await page.request.get(`${API}/admin/users?sort=hashed_password`, { headers: h })).status()).toBe(422);
  expect((await page.request.get(`${API}/admin/users?role=root`, { headers: h })).status()).toBe(422);
  const nulls = await (await page.request.get(`${API}/admin/users?sort=last_login&order=desc`, { headers: h })).json();
  expect(nulls.items.length).toBe(3);
});

test('an admin cannot delete or deactivate their own account through the API', async ({ page }) => {
  await login(page);
  const h = await headers(page);
  const me = await (await page.request.get(`${API}/auth/me`, { headers: h })).json();

  const del = await page.request.delete(`${API}/admin/users/${me.id}`, { headers: h });
  expect(del.status()).toBe(403);
  expect((await del.json()).detail).toBe('You cannot delete your own account');

  const off = await page.request.put(`${API}/admin/users/${me.id}`, { headers: h, data: { is_active: false } });
  expect(off.status()).toBe(403);
  expect((await off.json()).detail).toBe('You cannot deactivate your own account');

  const still = await (await page.request.get(`${API}/admin/users/${me.id}`, { headers: h })).json();
  expect(still.is_active).toBe(true);
});

test('resources: set a default supplier on a resource and see it in the table', async ({ page }) => {
  await login(page);
  await page.goto('/admin/resources');
  const grid = page.getByRole('grid', { name: 'Resources' });
  await expect(grid.getByRole('row', { name: /ENG-SR/ })).toContainText('Geotech Partners Pty Ltd'); // seeded default
  await page.getByLabel('Search resources').fill(RESOURCE);
  await expect(grid.getByRole('row', { name: new RegExp(RESOURCE) })).toContainText('None');

  await grid.getByRole('button', { name: `Edit ${RESOURCE}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Default supplier' }).click();
  await page.getByRole('option', { name: SUPPLIER.name }).click();
  const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/admin/resources/'));
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  const body = await (await saved).json();
  expect(body.supplier_code).toBe(SUPPLIER.code);
  expect(body.supplier_name).toBe(SUPPLIER.name);
  await expect(grid.getByRole('row', { name: new RegExp(RESOURCE) })).toContainText(SUPPLIER.name);

  // The supplier filter narrows the list on the server.
  await page.getByLabel('Search resources').fill('');
  const filtered = page.waitForResponse((r) => r.url().includes('supplier_code=' + SUPPLIER.code) && r.url().includes('/admin/resources?'));
  await page.getByRole('combobox', { name: 'Supplier' }).click();
  await page.getByRole('option', { name: SUPPLIER.name }).click();
  const list = await (await filtered).json();
  expect(list.items.map((r: { resource_code: string }) => r.resource_code).sort()).toEqual(['EQP-CRN', RESOURCE].sort());
});

// Below the md breakpoint the WBS detail panel opens as a drawer with the full assignments grid; the inline panel
// beside the tree (desktop) hides the Supplier column to save width.
test.describe('assignments', () => {
  test.use({ viewport: { width: 820, height: 1000 } });

  test('picking a resource with a default supplier pre-fills it, and the grid shows it after saving', async ({ page }) => {
    await login(page);
    const h = await headers(page);
    // Self-contained: give the resource its default supplier through the API (the test above does it through the UI).
    const lookup = await (await page.request.get(`${API}/admin/resources?search=${RESOURCE}`, { headers: h })).json();
    const resource = lookup.items.find((r: { resource_code: string }) => r.resource_code === RESOURCE);
    const set = await page.request.put(`${API}/admin/resources/${resource.id}`, { headers: h, data: { supplier_code: SUPPLIER.code } });
    expect(set.status()).toBe(200);
    const projects = await (await page.request.get(`${API}/projects`, { headers: h })).json();
    const project = projects.items.find((p: { project_name: string }) => p.project_name === depot.name);
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole('region', { name: 'Project summary' })).toBeVisible();

    const tree = page.getByRole('tree', { name: 'Work breakdown structure' });
    await expect(tree.getByRole('treeitem').first()).toBeVisible();
    for (let i = 0; i < 20; i++) {
      const collapsed = tree.locator('[role="treeitem"][aria-expanded="false"]');
      if ((await collapsed.count()) === 0) break;
      await collapsed.first().locator('span[aria-hidden="true"]').first().click();
    }
    await tree.getByRole('treeitem').filter({ hasText: /^1\.2\s*Drainage/ }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Drainage' })).toBeVisible();

    let createdId: number | undefined;
    let wbsId: number | undefined;
    try {
      await page.getByRole('button', { name: 'Add Assignment' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'New Assignment' });
      await expect(dialog).toBeVisible();
      await expect(async () => {
        await dialog.getByRole('combobox', { name: 'Resource' }).click();
        await expect(page.getByRole('option', { name: new RegExp(`^${RESOURCE}`) })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await page.getByRole('option', { name: new RegExp(`^${RESOURCE}`) }).click();
      await expect(dialog.getByRole('combobox', { name: 'Supplier' })).toContainText(SUPPLIER.code);

      await dialog.getByLabel('Best Estimate').fill('1000');
      await dialog.getByLabel('Likely Estimate').fill('2000');
      await dialog.getByLabel('Worst Estimate').fill('4000');
      const posted = page.waitForResponse((r) => r.url().includes('/assignments') && r.request().method() === 'POST');
      await dialog.getByRole('button', { name: 'Create' }).click();
      const resp = await posted;
      expect(resp.status()).toBe(201);
      const created = await resp.json();
      createdId = created.id;
      wbsId = created.wbs_id;
      expect(created.supplier_code).toBe(SUPPLIER.code);

      const row = page.getByRole('grid', { name: 'Resource assignments' }).getByRole('row').filter({ hasText: RESOURCE });
      await expect(row).toContainText(SUPPLIER.code);
    } finally {
      // Leave the seeded totals as they were for smoke.spec.ts, and put the resource back to no supplier.
      if (createdId !== undefined && wbsId !== undefined) {
        await page.request.delete(`${API}/projects/${project.id}/wbs/${wbsId}/assignments/${createdId}`, { headers: h });
      }
      const res = await (await page.request.get(`${API}/admin/resources?search=${RESOURCE}`, { headers: h })).json();
      const row = res.items.find((r: { resource_code: string }) => r.resource_code === RESOURCE);
      if (row) await page.request.put(`${API}/admin/resources/${row.id}`, { headers: h, data: { supplier_code: null } });
    }
  });
});

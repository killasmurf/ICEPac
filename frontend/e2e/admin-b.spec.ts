import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { adminBRoutes } from './fixtures/adminBRoutes';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, adminBRoutes);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const fail500 = (page: Page, pattern: RegExp) =>
  page.route(pattern, (route) =>
    route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Internal error' }),
    }),
  );

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function axeBlocking(page: Page) {
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.impact, rule: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }));
}

// ───────────────────────── Config Tables ─────────────────────────

test.describe('config tables', () => {
  test('renders items from the API without a weight column on plain tables', async ({ page }, testInfo) => {
    await page.goto('/admin/config');
    const grid = page.getByRole('grid', { name: 'Cost Types items' });
    await expect(grid.getByText('LABOUR', { exact: true })).toBeVisible();
    await expect(grid.getByText('Materials and supplies')).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'Weight' })).toHaveCount(0);
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'admin-config-light');
  });

  test('selected table is kept in the URL and weighted tables show Weight', async ({ page }) => {
    await page.goto('/admin/config?table=probability-levels');
    const grid = page.getByRole('grid', { name: 'Probability Levels items' });
    await expect(grid.getByRole('columnheader', { name: 'Weight' })).toBeVisible();
    await expect(grid.getByText('80')).toBeVisible();
  });

  test('switching table updates the URL', async ({ page }, testInfo) => {
    await page.goto('/admin/config');
    await expect(page.getByRole('grid', { name: 'Cost Types items' })).toBeVisible();
    if (testInfo.project.name === 'desktop') {
      await page.getByRole('tab', { name: 'Probability Levels' }).click();
    } else {
      await page.getByRole('combobox', { name: 'Table' }).click();
      await page.getByRole('option', { name: 'Probability Levels' }).click();
    }
    await expect(page).toHaveURL(/table=probability-levels/);
    await expect(page.getByRole('grid', { name: 'Probability Levels items' })).toBeVisible();
  });

  test('empty table shows an empty state with a call to action', async ({ page }) => {
    await page.goto('/admin/config?table=regions');
    await expect(page.getByText('No items yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add item' }).first()).toBeVisible();
  });

  test('items API failure shows an error state and retry works', async ({ page }) => {
    await fail500(page, /\/api\/v1\/admin\/config\/cost-types$/);
    await page.goto('/admin/config');
    await expect(page.getByText('Could not load data')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('tables API failure shows an error state', async ({ page }) => {
    await fail500(page, /\/api\/v1\/admin\/config$/);
    await page.goto('/admin/config');
    await expect(page.getByText('Could not load configuration tables')).toBeVisible({ timeout: 10_000 });
  });

  test('create sends POST without weight on a plain table and toasts', async ({ page }) => {
    await page.goto('/admin/config');
    await expect(page.getByText('LABOUR', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add item' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog.getByText('Code is required')).toBeVisible();
    await dialog.getByLabel('Code').fill('PLANT');
    await dialog.getByLabel('Description').fill('Plant hire');
    await expect(dialog.getByLabel('Weight')).toHaveCount(0);
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/admin/config/cost-types'));
    await dialog.getByRole('button', { name: 'Create' }).click();
    expect((await req).postDataJSON()).toEqual({ code: 'PLANT', description: 'Plant hire', is_active: true });
    await expect(page.getByText('Item created')).toBeVisible();
  });

  test('create on a weighted table sends a numeric weight', async ({ page }) => {
    await page.goto('/admin/config?table=probability-levels');
    await expect(page.getByText('Medium')).toBeVisible();
    await page.getByRole('button', { name: 'Add item' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Code').fill('VH');
    await dialog.getByLabel('Description').fill('Very high');
    await dialog.getByLabel('Weight').fill('150');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog.getByText('Weight must be between 0 and 100')).toBeVisible();
    await dialog.getByLabel('Weight').fill('95');
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/admin/config/probability-levels'));
    await dialog.getByRole('button', { name: 'Create' }).click();
    expect((await req).postDataJSON()).toEqual({ code: 'VH', description: 'Very high', weight: 95, is_active: true });
    await expect(page.getByText('Item created')).toBeVisible();
  });

  test('edit sends PUT and toasts', async ({ page }) => {
    await page.goto('/admin/config');
    await page.getByRole('button', { name: 'Edit LABOUR' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Code')).toHaveValue('LABOUR');
    await dialog.getByLabel('Description').fill('Direct labour (updated)');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/admin/config/cost-types/1'));
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    expect((await req).postDataJSON()).toEqual({
      code: 'LABOUR',
      description: 'Direct labour (updated)',
      is_active: true,
    });
    await expect(page.getByText('Item updated')).toBeVisible();
  });

  test('delete asks for confirmation, sends DELETE and toasts', async ({ page }) => {
    await page.goto('/admin/config');
    await page.getByRole('button', { name: 'Delete MATERIAL' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Delete MATERIAL\?/)).toBeVisible();
    const req = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/admin/config/cost-types/2'));
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await req;
    await expect(page.getByText('Item deleted')).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      await page.goto('/admin/config');
      await expect(page.getByText('LABOUR', { exact: true })).toBeVisible();
      expect(await axeBlocking(page)).toEqual([]);
      if (scheme === 'dark') await saveScreenshot(page, testInfo, 'phase-4', 'admin-config-dark');
    });
  }
});

// ───────────────────────── Audit Logs ─────────────────────────

test.describe('audit logs', () => {
  test('renders entries from the API', async ({ page }, testInfo) => {
    await page.goto('/admin/audit-logs');
    const grid = page.getByRole('grid', { name: 'Audit log entries' });
    await expect(grid.getByText('Resource', { exact: true })).toBeVisible();
    await expect(grid.getByText('Supplier', { exact: true })).toBeVisible();
    await expect(grid.getByText('Failed login')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'admin-audit-light');
  });

  test('requests page one with skip/limit', async ({ page }) => {
    const req = page.waitForRequest((r) => r.url().includes('/api/v1/admin/audit-logs'));
    await page.goto('/admin/audit-logs');
    const url = new URL((await req).url());
    expect(url.searchParams.get('skip')).toBe('0');
    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.get('action')).toBeNull();
  });

  test('action filter is sent to the server', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await expect(page.getByText('Failed login')).toBeVisible();
    const req = page.waitForRequest((r) => r.url().includes('/admin/audit-logs') && r.url().includes('action=CREATE'));
    await page.getByRole('combobox', { name: 'Action' }).click();
    await page.getByRole('option', { name: 'Create' }).click();
    expect(new URL((await req).url()).searchParams.get('skip')).toBe('0');
  });

  test('entity type filter is sent to the server', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await expect(page.getByText('Failed login')).toBeVisible();
    const req = page.waitForRequest((r) => r.url().includes('entity_type=Supplier'));
    await page.getByRole('searchbox', { name: 'Entity type' }).fill('Supplier');
    await req;
  });

  test('row click opens a drawer with pretty-printed old and new values', async ({ page }, testInfo) => {
    await page.goto('/admin/audit-logs');
    await page.getByRole('row', { name: /Resource/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Audit entry details' });
    await expect(drawer.getByText('Audit entry #301')).toBeVisible();
    await expect(drawer.getByText('jordan')).toBeVisible();
    await expect(drawer.getByLabel('Old values (JSON)')).toContainText('"cost": 120');
    await expect(drawer.getByLabel('New values (JSON)')).toContainText('"cost": 135');
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'admin-audit-drawer-light');
    await drawer.getByRole('button', { name: 'Close details' }).click();
    await expect(drawer).toBeHidden();
  });

  test('drawer handles null values and values that are not JSON', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await page.getByRole('row', { name: /Supplier/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Audit entry details' });
    await expect(drawer.getByText('No value recorded.')).toHaveCount(1);
    await drawer.getByRole('button', { name: 'Close details' }).click();
    await page.getByRole('row', { name: /Failed login/ }).click();
    await expect(drawer.getByLabel('Old values (JSON)')).toHaveText('not valid json {');
    await expect(drawer.getByText('System')).toBeVisible();
  });

  test('empty list shows the empty state', async ({ page }) => {
    await page.unroute('**/api/v1/**');
    api = await mockApi(page, {
      ...adminBRoutes,
      'GET /admin/audit-logs': () => ({ items: [], total: 0, skip: 0, limit: 25 }),
    });
    await page.goto('/admin/audit-logs');
    await expect(page.getByText('No audit entries yet')).toBeVisible();
  });

  test('API failure shows an error with retry and a toast', async ({ page }) => {
    await fail500(page, /\/api\/v1\/admin\/audit-logs/);
    await page.goto('/admin/audit-logs');
    await expect(page.getByText('Could not load data')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      await page.goto('/admin/audit-logs');
      await expect(page.getByText('Failed login')).toBeVisible();
      expect(await axeBlocking(page)).toEqual([]);
      await page.getByRole('row', { name: /Resource/ }).click();
      await expect(page.getByRole('dialog', { name: 'Audit entry details' })).toBeVisible();
      expect(await axeBlocking(page)).toEqual([]);
      if (scheme === 'dark') await saveScreenshot(page, testInfo, 'phase-4', 'admin-audit-drawer-dark');
    });
  }
});

// ───────────────────────── Admin Overview ─────────────────────────

test.describe('admin overview', () => {
  test('renders stats, recent activity and quick links', async ({ page }, testInfo) => {
    await page.goto('/admin');
    await expect(page.getByText('128')).toBeVisible();
    await expect(page.getByText('Active users')).toBeVisible();
    await expect(page.getByText('14', { exact: true })).toBeVisible();
    await expect(page.getByText('24', { exact: true })).toBeVisible();
    await expect(page.getByText('Update')).toBeVisible();
    await expect(page.getByText('Resource #45')).toBeVisible();
    await expect(page.getByText('by System')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Audit Logs/ })).toHaveAttribute('href', '/admin/audit-logs');
    await expect(page.getByRole('link', { name: /^Config Tables/ })).toHaveAttribute('href', '/admin/config');
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'admin-overview-light');
  });

  test('empty activity shows the empty state', async ({ page }) => {
    await page.unroute('**/api/v1/**');
    api = await mockApi(page, {
      ...adminBRoutes,
      'GET /dashboard/stats': () => ({
        ...(JSON.parse(JSON.stringify({ admin: { users: 1, active_users: 1, resources: 0, suppliers: 0 } }))),
        recent_activity: [],
      }),
    });
    await page.goto('/admin');
    await expect(page.getByText('No recent activity')).toBeVisible();
  });

  test('API failure shows an error state and retry works', async ({ page }) => {
    let fail = true;
    await page.route(/\/api\/v1\/dashboard\/stats/, (route) => {
      if (!fail) return route.fallback();
      return route.fulfill({
        status: 500,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal error' }),
      });
    });
    await page.goto('/admin');
    await expect(page.getByText('Could not load the overview')).toBeVisible({ timeout: 10_000 });
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('128')).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      await page.goto('/admin');
      await expect(page.getByText('128')).toBeVisible();
      expect(await axeBlocking(page)).toEqual([]);
      if (scheme === 'dark') await saveScreenshot(page, testInfo, 'phase-4', 'admin-overview-dark');
    });
  }
});

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';
import { adminARoutes, emptyList } from './fixtures/adminARoutes';

const PHASE = 'phase-4';
let api: MockApiHandle;

const savedUser = { id: 99, email: 'new@example.com', username: 'newuser', full_name: null, role: 'viewer', is_active: true, is_verified: false, created_at: '2026-11-16T00:00:00Z', updated_at: '2026-11-16T00:00:00Z', last_login: null };
const savedResource = { id: 99, resource_code: 'NEW-001', description: 'New resource', eoc: 'Labour', cost: '250.00', units: 'hours', is_active: true, created_at: '2026-11-16T00:00:00Z', updated_at: '2026-11-16T00:00:00Z' };
const savedSupplier = { id: 99, supplier_code: 'NEW-001', name: 'New Supplier', contact: null, email: null, phone: null, notes: null, is_active: true, created_at: '2026-11-16T00:00:00Z', updated_at: '2026-11-16T00:00:00Z' };

const writes = {
  'POST /admin/users': savedUser,
  'PUT /admin/users/2': { ...savedUser, id: 2, username: 'user2' },
  'PUT /admin/users/2/password': { detail: 'Password updated' },
  'DELETE /admin/users/2': {},
  'POST /admin/resources': savedResource,
  'PUT /admin/resources/1': { ...savedResource, id: 1, resource_code: 'RES-001' },
  'DELETE /admin/resources/1': {},
  'POST /admin/suppliers': savedSupplier,
  'PUT /admin/suppliers/1': { ...savedSupplier, id: 1, name: 'Supplier 1 Pty Ltd' },
  'DELETE /admin/suppliers/1': {},
};

async function failWith500(page: Page, pattern: RegExp) {
  await page.route(pattern, (route) =>
    route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal error' }) }),
  );
}

async function emptyAt(page: Page, pattern: RegExp) {
  await page.route(pattern, (route) =>
    route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify(emptyList) }),
  );
}

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, { ...adminARoutes, ...writes });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

/** Narrow screens scroll the grid sideways; the actions column is last and virtualised until scrolled into view. */
const revealActions = (page: Page) =>
  page.locator('.MuiDataGrid-virtualScroller').evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });

const noHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

const screens = [
  { name: 'users', path: '/admin/users', heading: 'User management', ready: 'Test User 2' },
  { name: 'resources', path: '/admin/resources', heading: 'Resource library', ready: 'Resource 2 description' },
  { name: 'suppliers', path: '/admin/suppliers', heading: 'Supplier management', ready: 'Supplier 2 Pty Ltd' },
] as const;

for (const s of screens) {
  test.describe(s.name, () => {
    test('renders from fixtures and has no horizontal scroll', async ({ page }, testInfo) => {
      await page.goto(s.path);
      await expect(page.getByRole('heading', { name: s.heading })).toBeVisible();
      await expect(page.getByText(s.ready)).toBeVisible();
      await noHorizontalScroll(page);
      await saveScreenshot(page, testInfo, PHASE, `admin-a-${s.name}-light`);
    });

    test('dark mode screenshot', async ({ page }, testInfo) => {
      await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
      await page.goto(s.path);
      await expect(page.getByText(s.ready)).toBeVisible();
      await page.waitForTimeout(400);
      await saveScreenshot(page, testInfo, PHASE, `admin-a-${s.name}-dark`);
    });

    test('shows the empty state for an empty list', async ({ page }) => {
      await emptyAt(page, new RegExp(`/api/v1/admin/${s.name}\\?`));
      await page.goto(s.path);
      await expect(page.getByText(new RegExp(`No ${s.name} yet`, 'i'))).toBeVisible();
      await expect(page.getByRole('button', { name: /^Add / }).first()).toBeVisible();
      await noHorizontalScroll(page);
    });

    test('shows an error state with retry and an error toast on 500', async ({ page }) => {
      await failWith500(page, new RegExp(`/api/v1/admin/${s.name}\\?`));
      await page.goto(s.path);
      await expect(page.getByText(new RegExp(`Could not load ${s.name}`, 'i'))).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('alert').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('server pagination maps to skip/limit and keeps rows while loading', async ({ page }) => {
      await page.goto(s.path);
      await expect(page.getByText(s.ready)).toBeVisible();
      const next = page.waitForRequest((r) => r.url().includes(`/admin/${s.name}`) && r.url().includes('skip=10'));
      await page.getByRole('button', { name: /next page/i }).click();
      const req = await next;
      expect(new URL(req.url()).searchParams.get('limit')).toBe('10');
      await expect(page.getByText(/11.*12 of 12/)).toBeVisible();
    });

    for (const scheme of ['light', 'dark'] as const) {
      test(`no serious or critical axe violations (${scheme})`, async ({ page }) => {
        await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
        await page.goto(s.path);
        await expect(page.getByText(s.ready)).toBeVisible();
        await page.waitForTimeout(500);
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
      });
    }
  });
}

test.describe('users actions', () => {
  test('create posts the new user and shows a toast', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Add user' }).first().click();
    await page.getByRole('dialog').getByLabel('Username').fill('newuser');
    await page.getByRole('dialog').getByLabel('Email').fill('new@example.com');
    await page.getByRole('dialog').getByLabel('Password').fill('longenough1');
    await page.getByRole('dialog').getByLabel('Role').click();
    await page.getByRole('option', { name: 'Viewer' }).click();
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/admin/users'));
    await page.getByRole('button', { name: 'Create user' }).click();
    expect((await req).postDataJSON()).toEqual({ username: 'newuser', email: 'new@example.com', password: 'longenough1', role: 'viewer' });
    await expect(page.getByText('User "newuser" created')).toBeVisible();
  });

  test('create validates required fields before sending', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Add user' }).first().click();
    await page.getByRole('button', { name: 'Create user' }).click();
    await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
    await expect(page.getByText('Password must be 8 to 128 characters')).toBeVisible();
  });

  test('edit puts changes without a password', async ({ page }) => {
    await page.goto('/admin/users');
    await revealActions(page);
    await page.getByRole('button', { name: 'Edit user2' }).click();
    await expect(page.getByRole('dialog').getByLabel('Password')).toHaveCount(0);
    await page.getByRole('dialog').getByLabel('Full name').fill('Renamed User');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/admin/users/2'));
    await page.getByRole('button', { name: 'Save changes' }).click();
    const body = (await req).postDataJSON();
    expect(body).toMatchObject({ username: 'user2', full_name: 'Renamed User', role: 'user', is_active: true });
    expect(body).not.toHaveProperty('password');
    await expect(page.getByText('User "user2" updated')).toBeVisible();
  });

  test('reset password sends the new password', async ({ page }) => {
    await page.goto('/admin/users');
    await revealActions(page);
    await page.getByRole('button', { name: 'Reset password for user2' }).click();
    await page.getByRole('dialog').getByLabel('Current password').fill('oldpassword');
    await page.getByRole('dialog').getByLabel(/^New password/).fill('brandnewpass1');
    await page.getByRole('dialog').getByLabel('Confirm new password').fill('brandnewpass1');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/admin/users/2/password'));
    await page.getByRole('button', { name: 'Update password' }).click();
    expect((await req).postDataJSON()).toEqual({ current_password: 'oldpassword', new_password: 'brandnewpass1' });
    await expect(page.getByText('Password updated for "user2"')).toBeVisible();
  });

  test('delete asks for confirmation then issues DELETE', async ({ page }) => {
    await page.goto('/admin/users');
    await revealActions(page);
    await page.getByRole('button', { name: 'Delete user2' }).click();
    const req = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/admin/users/2'));
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await req;
    await expect(page.getByText('User "user2" deleted')).toBeVisible();
  });

  test('the signed-in user cannot delete or deactivate themselves', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Test User 2')).toBeVisible();
    await revealActions(page);
    await expect(page.getByRole('button', { name: 'Delete jordan' })).toBeDisabled();
    await revealActions(page);
    await page.getByRole('button', { name: 'Edit jordan' }).click();
    await expect(page.getByRole('dialog').getByRole('combobox', { name: 'Status' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText('You cannot deactivate your own account')).toBeVisible();
  });

  test('role and status filters narrow the table', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Test User 2')).toBeVisible();
    await page.getByRole('combobox', { name: 'Role' }).click();
    await page.getByRole('option', { name: 'Manager' }).click();
    await expect(page.getByText('Test User 2')).toHaveCount(0);
    await expect(page.getByText('Test User 1')).toHaveCount(0);
  });
});

test.describe('resources actions', () => {
  test('create posts the new resource and shows a toast', async ({ page }) => {
    await page.goto('/admin/resources');
    await page.getByRole('button', { name: 'Add resource' }).first().click();
    await page.getByRole('dialog').getByLabel('Resource code').fill('new-001');
    await page.getByRole('dialog').getByLabel('Description').fill('New resource');
    await page.getByRole('dialog').getByLabel('EOC (element of cost)').fill('Labour');
    await page.getByRole('dialog').getByRole('spinbutton', { name: 'Cost' }).fill('250');
    await page.getByRole('dialog').getByLabel('Units').fill('hours');
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/admin/resources'));
    await page.getByRole('button', { name: 'Create resource' }).click();
    expect((await req).postDataJSON()).toEqual({ resource_code: 'new-001', description: 'New resource', eoc: 'Labour', cost: 250, units: 'hours', is_active: true });
    await expect(page.getByText('Resource "NEW-001" created')).toBeVisible();
  });

  test('edit puts the changed cost', async ({ page }) => {
    await page.goto('/admin/resources');
    await revealActions(page);
    await page.getByRole('button', { name: 'Edit RES-001' }).click();
    await page.getByRole('dialog').getByRole('spinbutton', { name: 'Cost' }).fill('300');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/admin/resources/1'));
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await req).postDataJSON()).toMatchObject({ resource_code: 'RES-001', cost: 300 });
    await expect(page.getByText('Resource "RES-001" updated')).toBeVisible();
  });

  test('delete asks for confirmation then issues DELETE', async ({ page }) => {
    await page.goto('/admin/resources');
    await revealActions(page);
    await page.getByRole('button', { name: 'Delete RES-001' }).click();
    const req = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/admin/resources/1'));
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await req;
    await expect(page.getByText('Resource "RES-001" deleted')).toBeVisible();
  });

  test('costs are formatted as currency and the EOC filter is built from loaded data', async ({ page }) => {
    await page.goto('/admin/resources');
    await expect(page.getByText('$100.50')).toBeVisible();
    await page.getByLabel('EOC', { exact: true }).click();
    await expect(page.getByRole('option', { name: 'Materials' })).toBeVisible();
    await page.getByRole('option', { name: 'Materials' }).click();
    await expect(page.getByText('Resource 2 description')).toHaveCount(0);
    await expect(page.getByText('Resource 1 description')).toBeVisible();
  });

  test('search and active-only map to the API parameters', async ({ page }) => {
    await page.goto('/admin/resources');
    const req = page.waitForRequest((r) => r.url().includes('/admin/resources') && r.url().includes('search=RES-00'));
    await page.getByLabel('Search resources').fill('RES-00');
    expect(new URL((await req).url()).searchParams.get('skip')).toBe('0');
    const active = page.waitForRequest((r) => r.url().includes('active_only=true'));
    await page.getByLabel('Active only').check();
    await active;
  });
});

test.describe('suppliers actions', () => {
  test('create posts the new supplier and shows a toast', async ({ page }) => {
    await page.goto('/admin/suppliers');
    await page.getByRole('button', { name: 'Add supplier' }).first().click();
    await page.getByRole('dialog').getByLabel('Supplier code').fill('new-001');
    await page.getByRole('dialog').getByLabel('Name').fill('New Supplier');
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/admin/suppliers'));
    await page.getByRole('button', { name: 'Create supplier' }).click();
    expect((await req).postDataJSON()).toMatchObject({ supplier_code: 'new-001', name: 'New Supplier', is_active: true });
    await expect(page.getByText('Supplier "New Supplier" created')).toBeVisible();
  });

  test('edit puts the changed contact', async ({ page }) => {
    await page.goto('/admin/suppliers');
    await revealActions(page);
    await page.getByRole('button', { name: 'Edit Supplier 1 Pty Ltd' }).click();
    await page.getByRole('dialog').getByLabel('Contact').fill('Pat Example');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/admin/suppliers/1'));
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await req).postDataJSON()).toMatchObject({ supplier_code: 'SUP-001', contact: 'Pat Example' });
    await expect(page.getByText('Supplier "Supplier 1 Pty Ltd" updated')).toBeVisible();
  });

  test('delete asks for confirmation then issues DELETE', async ({ page }) => {
    await page.goto('/admin/suppliers');
    await revealActions(page);
    await page.getByRole('button', { name: 'Delete Supplier 1 Pty Ltd' }).click();
    const req = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/admin/suppliers/1'));
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await req;
    await expect(page.getByText('Supplier "Supplier 1 Pty Ltd" deleted')).toBeVisible();
  });
});

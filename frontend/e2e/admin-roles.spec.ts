import { test, expect, type Page } from '@playwright/test';
import { mockApi, loginAs, type MockApiHandle, type Role } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

/**
 * Role matrix for Administration (F-13). Admins keep full control; managers see Administration but cannot
 * grant admin or change admin accounts (the API answers 403); users and viewers never see it.
 */
const now = '2026-11-16T00:00:00Z';
const account = (id: number, username: string, role: Role) => ({
  id, email: `${username}@example.com`, username, full_name: `Person ${username}`, role, is_active: true, is_verified: true,
  created_at: now, updated_at: now, last_login: null,
});
const users = [account(1, 'meg', 'manager'), account(2, 'root', 'admin'), account(3, 'uma', 'user'), account(4, 'mick', 'manager')];

let api: MockApiHandle;
const isMobile = (name: string) => name === 'mobile';

async function setup(page: Page, role: Role) {
  api = await mockApi(page, {
    'GET /auth/me': { ...account(role === 'admin' ? 2 : 1, role === 'admin' ? 'root' : 'meg', role) },
    'GET /admin/users': (url: URL) => {
      const skip = Number(url.searchParams.get('skip') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 10);
      return { items: users.slice(skip, skip + limit), total: users.length, skip, limit };
    },
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, role);
}

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const reveal = (page: Page) =>
  page.locator('.MuiDataGrid-virtualScroller').evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });

for (const [role, sees] of [['admin', true], ['manager', true], ['user', false], ['viewer', false]] as const) {
  test(`${role} ${sees ? 'sees' : 'does not see'} Administration in the navigation`, async ({ page }, testInfo) => {
    await setup(page, role);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    if (isMobile(testInfo.project.name)) await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
    if (sees) {
      await expect(nav.getByText('Administration', { exact: true })).toBeVisible();
      for (const label of ['Overview', 'Users', 'Resources', 'Suppliers', 'Config Tables', 'Audit Logs']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
    } else {
      await expect(nav.getByText('Administration', { exact: true })).toHaveCount(0);
      await expect(nav.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
    }
  });
}

for (const role of ['user', 'viewer'] as const) {
  test(`${role} is told they are not authorised on /admin/users`, async ({ page }) => {
    await setup(page, role);
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
  });
}

test.describe('user management as admin', () => {
  test('offers Admin and can edit an admin account', async ({ page }, testInfo) => {
    await setup(page, 'admin');
    await page.goto('/admin/users');
    await expect(page.getByText('Person uma')).toBeVisible();
    await reveal(page);
    await expect(page.getByRole('button', { name: 'Edit root' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Reset password for root' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Edit meg' })).toBeEnabled();
    // never their own account
    await expect(page.getByRole('button', { name: 'Delete root' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Delete meg' })).toBeEnabled();
    await saveScreenshot(page, testInfo, 'phase-4', 'users-as-admin');

    await page.getByRole('button', { name: 'Edit uma' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'Role' }).click();
    await expect(page.getByRole('option', { name: 'Admin' })).toBeVisible();
  });
});

test.describe('user management as manager', () => {
  test('hides Admin from the role selector and disables admin-account actions', async ({ page }, testInfo) => {
    await setup(page, 'manager');
    await page.goto('/admin/users');
    await expect(page.getByText('Person uma')).toBeVisible();
    await reveal(page);
    await saveScreenshot(page, testInfo, 'phase-4', 'users-as-manager');

    // admin account: edit, reset password and delete are disabled
    for (const name of ['Edit root', 'Reset password for root', 'Delete root']) {
      await expect(page.getByRole('button', { name })).toBeDisabled();
    }
    await page.getByRole('button', { name: 'Edit root' }).locator('..').hover();
    await expect(page.getByRole('tooltip')).toHaveText('Only administrators can change administrator accounts');
    await page.mouse.move(2, 2);
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    // other accounts stay manageable (never delete yourself)
    await expect(page.getByRole('button', { name: 'Edit uma' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Reset password for uma' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Delete uma' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Delete mick' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Delete meg' })).toBeDisabled();

    // role selector when editing someone else: no Admin
    await page.getByRole('button', { name: 'Edit uma' }).click();
    await page.getByRole('dialog').getByRole('combobox', { name: 'Role' }).click();
    await expect(page.getByRole('option', { name: 'Manager' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Viewer' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Admin' })).toHaveCount(0);
  });

  test('cannot change their own role', async ({ page }) => {
    await setup(page, 'manager');
    await page.goto('/admin/users');
    await expect(page.getByText('Person uma')).toBeVisible();
    await reveal(page);
    await page.getByRole('button', { name: 'Edit meg' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('combobox', { name: 'Role' })).toHaveAttribute('aria-disabled', 'true');
    await expect(dialog.getByText('You cannot change your own role')).toBeVisible();
  });

  test('the Add user form has no Admin role', async ({ page }) => {
    await setup(page, 'manager');
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Add user' }).first().click();
    await page.getByRole('dialog').getByRole('combobox', { name: 'Role' }).click();
    await expect(page.getByRole('option', { name: 'Manager' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Admin' })).toHaveCount(0);
  });

  test('the other Administration pages load', async ({ page }) => {
    await setup(page, 'manager');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Not authorised' })).toHaveCount(0);
    await expect(page.getByRole('main')).toBeVisible();
  });
});

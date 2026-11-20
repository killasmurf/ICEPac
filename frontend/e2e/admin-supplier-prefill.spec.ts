import { test, expect, type Page } from '@playwright/test';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { estimationRoutes } from './fixtures/estimationRoutes';
import { saveScreenshot } from './fixtures/screenshot';

/** Picking a resource in a new assignment pre-fills the resource's default supplier (unless one is already chosen). */

const now = '2026-11-16T00:00:00Z';
const resource = (id: number, code: string, description: string, supplier: string | null) => ({
  id, resource_code: code, description, eoc: null, cost: '100.00', units: null,
  supplier_code: supplier, supplier_name: supplier ? 'Acme Pty Ltd' : null, is_active: true, created_at: now, updated_at: now,
});
const supplier = (id: number, code: string, name: string) => ({ id, supplier_code: code, name, is_active: true, created_at: now, updated_at: now });

let api: MockApiHandle;
let resourceLookups: string[];

test.beforeEach(async ({ page }) => {
  resourceLookups = [];
  api = await mockApi(page, {
    ...estimationRoutes,
    'GET /admin/resources': (url: URL) => {
      const search = url.searchParams.get('search');
      if (search) resourceLookups.push(search);
      const items = [resource(1, 'ENG', 'Engineer', 'ACME'), resource(2, 'PM', 'Project manager', null)];
      return { items, total: items.length, skip: 0, limit: 1000 };
    },
    'GET /admin/suppliers': {
      items: [supplier(1, 'ACME', 'Acme Pty Ltd'), supplier(2, 'ZED', 'Zed Ltd')],
      total: 2, skip: 0, limit: 1000,
    },
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

async function openNewAssignment(page: Page) {
  await page.goto('/projects/1?tab=wbs&wbs=11');
  await expect(page.getByRole('grid', { name: 'Resource assignments' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Assignment' }).first().click();
  return page.getByRole('dialog', { name: 'New Assignment' });
}

test('picking a resource with a default supplier fills the empty supplier field', async ({ page }, testInfo) => {
  const dialog = await openNewAssignment(page);
  await dialog.getByRole('combobox', { name: /Resource/ }).click();
  await page.getByRole('option', { name: 'ENG - Engineer' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Supplier' })).toHaveText('ACME - Acme Pty Ltd');
  // The project page's reference data already carries each resource's supplier: no extra lookup.
  expect(resourceLookups).toEqual([]);
  await saveScreenshot(page, testInfo, 'closeout', 'assignment-supplier-prefill');

  await dialog.getByLabel('Best Estimate').fill('100');
  await dialog.getByLabel('Likely Estimate').fill('200');
  await dialog.getByLabel('Worst Estimate').fill('400');
  const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/projects/1/wbs/11/assignments'));
  await dialog.getByRole('button', { name: 'Create' }).click();
  expect((await request).postDataJSON()).toMatchObject({ resource_code: 'ENG', supplier_code: 'ACME' });
});

test('a resource without a default supplier leaves the field empty', async ({ page }) => {
  const dialog = await openNewAssignment(page);
  await dialog.getByRole('combobox', { name: /Resource/ }).click();
  await page.getByRole('option', { name: 'PM - Project manager' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Supplier' })).not.toContainText('ACME');
  await expect(dialog.getByRole('combobox', { name: 'Supplier' })).not.toContainText('ZED');
});

test('a supplier the user already chose is not overwritten', async ({ page }) => {
  const dialog = await openNewAssignment(page);
  await dialog.getByRole('combobox', { name: 'Supplier' }).click();
  await page.getByRole('option', { name: 'ZED - Zed Ltd' }).click();
  await dialog.getByRole('combobox', { name: /Resource/ }).click();
  await page.getByRole('option', { name: 'ENG - Engineer' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Supplier' })).toHaveText('ZED - Zed Ltd');
});

import { test, expect } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

test('unknown route shows Page not found and the button returns to the dashboard', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

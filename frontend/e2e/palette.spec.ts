import { test, expect } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

test('Ctrl+K, type a project name, Enter opens the project', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Search pages, projects and actions' });
  await expect(input).toBeFocused();
  await expect(page.getByRole('option', { name: /Data Centre Fit-out/ })).toBeVisible();
  await saveScreenshot(page, testInfo, 'phase-2', 'palette');
  await input.fill('Data Centre');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/projects\/2$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('opens from the header button and closes on Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: /search/i }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('actions: toggle colour mode and sign out', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible(); // shell is mounted
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Toggle');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.getByRole('combobox').fill('Sign out');
  await expect(page.getByRole('option', { name: 'Sign out' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
});

test('New project action opens the create dialog on the Projects page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('New project');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/projects\?new=1$/);
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/Project name/)).toBeFocused();
});

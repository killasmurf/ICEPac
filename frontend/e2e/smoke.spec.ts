import { test, expect } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

const PHASE = 'phase-0';
let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

test('login page renders', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'ICEPac Login' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await saveScreenshot(page, testInfo, PHASE, 'login');
});

test('dashboard shows after login', async ({ page }, testInfo) => {
  await loginAs(page, 'admin');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await saveScreenshot(page, testInfo, PHASE, 'dashboard');
});

test('projects page lists the fixture projects', async ({ page }, testInfo) => {
  await loginAs(page, 'admin');
  await page.goto('/projects');
  await expect(page.getByText('Harbour Bridge Refurbishment')).toBeVisible();
  await expect(page.getByText('Data Centre Fit-out')).toBeVisible();
  await saveScreenshot(page, testInfo, PHASE, 'projects');
});

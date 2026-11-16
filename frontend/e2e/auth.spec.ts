import { test, expect } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

test('no token: /projects redirects to /login?next, and login returns to /projects', async ({ page }) => {
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects$/);
  await page.getByLabel('Username').fill('jordan');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText('Harbour Bridge Refurbishment')).toBeVisible();
});

test('Sign out returns to /login and clears the token', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
});

test('user role visiting /admin/users sees Not authorised', async ({ page }) => {
  await loginAs(page, 'user');
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
});

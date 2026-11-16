import { test, expect, type Page } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

const PHASE = 'phase-1';
const LIGHT_BG = 'rgb(245, 247, 249)';
const DARK_BG = 'rgb(10, 25, 40)';
let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  // Honoured by the theme's CssBaseline rule; also stops mid-transition screenshots.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Start every test in light mode regardless of the browser's colour-scheme preference.
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const bodyStyle = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { font: s.fontFamily, bg: s.backgroundColor };
  });

async function checkBothModes(page: Page, testInfo: Parameters<typeof saveScreenshot>[1], name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await bodyStyle(page)).bg).toBe(LIGHT_BG);
  expect((await bodyStyle(page)).font.startsWith('"Plus Jakarta Sans')).toBe(true);
  await saveScreenshot(page, testInfo, PHASE, `${name}-light`);

  // The toggle cycles light -> dark.
  await page.getByRole('button', { name: 'Switch colour mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(async () => (await bodyStyle(page)).bg).toBe(DARK_BG);
  await page.mouse.move(700, 600); // dismiss the toggle's tooltip before the screenshot
  await saveScreenshot(page, testInfo, PHASE, `${name}-dark`);
}

test('login page uses the Adalex theme in light and dark', async ({ page }, testInfo) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'ICEPac Login' })).toBeVisible();
  // Login has no header, so switch mode through the stored preference instead of the toggle.
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await bodyStyle(page)).bg).toBe(LIGHT_BG);
  expect((await bodyStyle(page)).font.startsWith('"Plus Jakarta Sans')).toBe(true);
  await saveScreenshot(page, testInfo, PHASE, 'login-light');

  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(async () => (await bodyStyle(page)).bg).toBe(DARK_BG);
  await saveScreenshot(page, testInfo, PHASE, 'login-dark');
});

test('dashboard uses the Adalex theme in light and dark', async ({ page }, testInfo) => {
  await loginAs(page, 'admin');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await checkBothModes(page, testInfo, 'dashboard');
});

test('projects page uses the Adalex theme in light and dark', async ({ page }, testInfo) => {
  await loginAs(page, 'admin');
  await page.goto('/projects');
  await expect(page.getByText('Harbour Bridge Refurbishment')).toBeVisible();
  await checkBothModes(page, testInfo, 'projects');
});

import { test, expect } from '@playwright/test';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { projectDetailRoutes } from './fixtures/projectDetailRoutes';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, projectDetailRoutes);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const isMobile = (name: string) => name === 'mobile';

test('nested route keeps the Projects item active', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'desktop sidebar');
  await loginAs(page, 'admin');
  await page.goto('/projects/1');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  // Breadcrumbs show the project name.
  await expect(page.getByRole('group', { name: 'Breadcrumb' }).getByText('Harbour Bridge Refurbishment')).toBeVisible();
});

test('selecting an item does not collapse the desktop sidebar', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'desktop sidebar');
  await loginAs(page, 'admin');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible(); // labels still shown
  expect((await page.locator('main').boundingBox())?.x).toBe(248);
});

test('content starts beside the sidebar', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'desktop sidebar');
  await loginAs(page, 'admin');
  await page.goto('/projects');
  const main = await page.locator('main').boundingBox();
  expect(main?.x).toBe(248);
});

test('mobile: sidebar hidden until menu pressed, closes after navigating', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile only');
  await loginAs(page, 'admin');
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
});

test('collapse toggle persists across reload', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'desktop sidebar');
  await loginAs(page, 'admin');
  await page.goto('/projects');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  const mainX = async () => (await page.locator('main').boundingBox())?.x;
  await expect.poll(mainX).toBe(72);
  expect(await page.evaluate(() => localStorage.getItem('icepac.sidebarCollapsed'))).toBe('true');
  await page.reload();
  await expect.poll(mainX).toBe(72);
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  // Items stay reachable by name in rail mode, and selecting one keeps the rail.
  await nav.getByRole('link', { name: 'Reports' }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect.poll(mainX).toBe(72);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.mouse.move(700, 500);
  await saveScreenshot(page, testInfo, 'phase-2', 'rail-light');
});

test('user role sees no Administration section', async ({ page }, testInfo) => {
  await loginAs(page, 'user');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  if (isMobile(testInfo.project.name)) await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByText('Administration')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

test('admin sees Administration and exactly one nav landmark on /admin/users', async ({ page }, testInfo) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/users');
  if (isMobile(testInfo.project.name)) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await expect(page.locator('nav')).toHaveCount(1);
  await expect(page.getByRole('navigation').getByText('Administration', { exact: true })).toBeVisible();
});

test('header has breadcrumbs, search, colour toggle and avatar', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/users');
  const header = page.getByRole('banner');
  await expect(header.getByRole('group', { name: 'Breadcrumb' })).toContainText('Users');
  await expect(header.getByRole('button', { name: /search/i })).toBeVisible();
  await expect(header.getByRole('button', { name: 'Switch colour mode' })).toBeVisible();
  await header.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menu')).toContainText('Jordan Lee');
  await expect(page.getByRole('menu')).toContainText('jordan.lee@example.com');
  await expect(page.getByRole('menu')).toContainText('admin');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`screenshots ${scheme}`, async ({ page }, testInfo) => {
    await loginAs(page, 'admin');
    await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
    for (const [name, path, ready] of [
      ['dashboard', '/', 'Dashboard'],
      ['projects', '/projects', 'Harbour Bridge Refurbishment'],
      ['project-detail', '/projects/1', 'Harbour Bridge Refurbishment'],
      ['admin-users', '/admin/users', 'Users'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      await page.waitForTimeout(400);
      await saveScreenshot(page, testInfo, 'phase-2', `${name}-${scheme}`);
    }
  });
}

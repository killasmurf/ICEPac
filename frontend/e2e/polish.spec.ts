import { test, expect, type Page } from '@playwright/test';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';

/** Phase 6 polish: route transition, loading bar, focus and keyboard. */

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

/** Client-side navigation without relying on a visible nav link (the sidebar is a drawer on mobile). */
async function navigate(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('route transition', () => {
  test('page heading does not move after navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await navigate(page, '/help');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Help/i);
    const before = await heading.boundingBox();
    await page.waitForTimeout(400);
    const after = await heading.boundingBox();
    expect(before).not.toBeNull();
    expect(after).toEqual(before);
  });

  test('query-string changes do not re-run the fade', async ({ page }) => {
    await page.goto('/projects/1?tab=wbs');
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    await page.waitForTimeout(400);
    await navigate(page, '/projects/1?tab=risks');
    await expect(page.getByRole('tab', { name: /risks/i })).toHaveAttribute('aria-selected', 'true');
    const opacity = await page.locator('main > div > div').first().evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });
});

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

test.describe('loading polish', () => {
  test('paging a table keeps the rows, never shows the skeleton, and shows the progress bar', async ({ page }) => {
    // Slow down page two so the in-between state is observable.
    await page.route(/\/api\/v1\/admin\/resources\?.*skip=10/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fallback();
    });
    await page.goto('/admin/resources');
    await expect(page.getByText('Resource 2 description')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toHaveCount(0);

    await page.getByRole('button', { name: /next page/i }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await expect(page.getByText('Resource 2 description')).toBeVisible();

    await expect(page.getByText(/11.*12 of 12/)).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toHaveCount(0);
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  });

  test('the progress bar is 2px tall and sits at the bottom of the header', async ({ page }) => {
    await page.route(/\/api\/v1\/admin\/resources\?.*skip=10/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fallback();
    });
    await page.goto('/admin/resources');
    await expect(page.getByText('Resource 2 description')).toBeVisible();
    await page.getByRole('button', { name: /next page/i }).click();
    const bar = page.getByRole('progressbar', { name: 'Loading data' });
    await expect(bar).toBeVisible();
    const [barBox, headerBox] = await Promise.all([bar.boundingBox(), page.locator('header').first().boundingBox()]);
    expect(barBox?.height).toBe(2);
    // The header has a 1px bottom border, so the bar sits just inside it.
    const gap = (headerBox?.y ?? 0) + (headerBox?.height ?? 0) - ((barBox?.y ?? 0) + 2);
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  });
});

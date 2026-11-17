import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

async function ready(page: Page) {
  await page.goto('/projects/1?tab=summary');
  await expect(page.getByRole('heading', { name: 'Cost breakdown' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  await page.waitForTimeout(500);
}

test('cost breakdown: segmented control drives a ranked list whose shares sum to 100', async ({ page }) => {
  await ready(page);
  const list = page.getByTestId('breakdown-list');
  await expect(list.locator('li')).toHaveCount(5);
  await expect(list.locator('li').first()).toContainText('Labour');
  await expect(list.locator('li').first()).toContainText('41.6%');
  await expect(page.getByTestId('breakdown-total')).toHaveText('$1.3M');

  await page.getByRole('button', { name: 'Region' }).click();
  await expect(list.locator('li')).toHaveCount(3);
  await expect(list.locator('li').first()).toContainText('Victoria');

  // 9 resources collapse to 6 named slices plus "Other (3)".
  await page.getByRole('button', { name: 'Resource' }).click();
  await expect(list.locator('li')).toHaveCount(7);
  await expect(list.locator('li').last()).toContainText('Other (3)');
  const shares = await list.locator('li').evaluateAll((els) =>
    els.map((el) => parseFloat(el.lastElementChild?.textContent ?? '0')),
  );
  expect(Math.abs(shares.reduce((a, b) => a + b, 0) - 100)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Supplier' }).click();
  await expect(list.locator('li').first()).toContainText('Acme Pty Ltd');
  await expect(page.getByRole('table', { name: 'Cost by supplier' })).toBeAttached();
});

test('cost breakdown: the full table is behind a Show table toggle', async ({ page }) => {
  await ready(page);
  await expect(page.getByRole('grid', { name: 'Cost by cost type' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show table' }).click();
  await expect(page.getByRole('grid', { name: 'Cost by cost type' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide table' }).click();
  await expect(page.getByRole('grid', { name: 'Cost by cost type' })).toHaveCount(0);
});

test('cost breakdown: an all-zero breakdown shows an empty state, not a broken chart', async ({ page }) => {
  await mockApi(page, {
    'GET /projects/1/estimation': () => ({
      project_id: 1, project_name: 'Harbour Bridge Refurbishment', total_wbs_items: 1, total_assignments: 1,
      total_pert_estimate: 0, total_std_deviation: 0, confidence_80_low: 0, confidence_80_high: 0,
      total_risks: 0, total_risk_exposure: 0, risk_adjusted_estimate: 0,
      by_cost_type: [{ code: 'LAB', description: 'Labour', total_pert: 0, assignment_count: 1 }],
      by_region: [], by_resource: [], by_supplier: [], wbs_summaries: [],
    }),
  });
  await ready(page);
  await expect(page.getByText('No cost by cost type')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top WBS items by estimate' })).toHaveCount(0);
});

test('top WBS items: 9 bars from the fixture, each with a Low/High range bar', async ({ page }) => {
  await ready(page);
  const card = page.locator('.MuiCard-root', { has: page.getByRole('heading', { name: 'Top WBS items by estimate' }) });
  await expect(card.locator('.MuiBarChart-element')).toHaveCount(9);
  await expect(card.getByTestId('wbs-ranges').getByRole('listitem')).toHaveCount(9);
  await expect(card.getByTestId('wbs-ranges').getByRole('img', { name: /80% range/ })).toHaveCount(9);
  await expect(card.getByTestId('wbs-ranges').getByRole('img').first()).toHaveAttribute('aria-label', /Low .*High/);
  await expect(card.getByRole('table', { name: 'Top WBS items by estimate' }).locator('tbody tr')).toHaveCount(9);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`summary charts: no horizontal scroll, no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
    await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-5', `project-summary-${scheme}`);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
  });
}

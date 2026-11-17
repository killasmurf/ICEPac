import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

// A fixed local clock keeps the greeting and relative times stable.
test.use({ timezoneId: 'Australia/Melbourne', locale: 'en-AU' });

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.clock.setFixedTime(new Date('2026-11-16T14:00:00+11:00'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

async function failWith(page: Page, pattern: RegExp, status = 500) {
  await page.route(pattern, (route) =>
    route.fulfill({
      status,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Internal error' }),
    }),
  );
}

async function ready(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  await page.waitForTimeout(500);
}

const card = (page: Page, label: string) => page.locator('.MuiCard-root', { hasText: label }).filter({ has: page.getByText(label, { exact: true }) });
const noScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('greets the user, shows the date and offers a gold New project action', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.getByText('Good afternoon, Jordan')).toBeVisible();
  await expect(page.getByText('16 Nov 2026')).toBeVisible();
  const newProject = page.getByRole('link', { name: 'New project' });
  await expect(newProject).toHaveAttribute('href', '/projects?new=1');
  await newProject.click();
  await expect(page).toHaveURL(/\/projects\?new=1/);
});

test('the four headline figures match the fixture', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(card(page, 'Active projects')).toContainText('2');
  await expect(card(page, 'Active projects')).toContainText('of 4 projects');
  await expect(card(page, 'Total estimate')).toContainText('$123.5K');
  await expect(card(page, 'WBS awaiting approval')).toContainText('3');
  // "Risks" is also a column in the hidden portfolio table, so pin the stat card by its hint.
  const risks = card(page, 'Risks').filter({ hasText: 'across 4 projects' });
  await expect(risks).toContainText('9');
  // The animated digits are hidden from assistive tech; the final value is the accessible text.
  await expect(card(page, 'Total estimate').locator('[aria-hidden="true"]', { hasText: '$123.5K' })).toHaveCount(1);
});

test('estimate by project has 10 bars, a data table and opens a project on click', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'Estimate by project' });
  await expect(section.locator('tbody tr')).toHaveCount(10);
  await expect(section.locator('.MuiBarChart-element')).toHaveCount(10);
  await expect(section.getByRole('table', { name: 'Estimate by project' })).toBeAttached();
  await section.locator('.MuiBarChart-element').first().click();
  await expect(page).toHaveURL(/\/projects\/1$/);
});

test('keyboard users reach every project through the data table', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'Estimate by project' });
  const first = section.getByRole('link', { name: 'Harbour Bridge Refurbishment' });
  await first.focus();
  await expect(first).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/projects\/1$/);
});

test('approval status shows the approved percentage and a labelled legend', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'Approval status' });
  await expect(section.getByTestId('approved-percent')).toHaveText('30%');
  const table = section.getByRole('table', { name: 'WBS items by approval status' });
  await expect(table.getByRole('row', { name: 'Approved 12' })).toBeAttached();
  await expect(table.getByRole('row', { name: 'Rejected 5' })).toBeAttached();
  for (const label of ['Approved', 'Submitted', 'Rejected', 'Draft']) {
    await expect(section.getByText(label, { exact: true }).first()).toBeVisible();
  }
});

test('approval status shows a dash when there are no WBS items', async ({ page }) => {
  await mockApi(page, {
    'GET /dashboard/portfolio': () => ({
      projects: [{ project_id: 1, name: 'Only project', status: 'draft', wbs_total: 0, wbs_approved: 0, wbs_submitted: 0, total_pert: 0, risk_count: 0 }],
      approval_totals: { draft: 0, submitted: 0, approved: 0, rejected: 0 },
    }),
  });
  await page.goto('/');
  await ready(page);
  await expect(page.getByTestId('approved-percent')).toHaveText('—');
});

test('recent activity shows relative time with the absolute time in a tooltip', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'Recent activity' });
  await expect(section.getByRole('listitem')).toHaveCount(3);
  await expect(section.getByText('jordan updated Resource #45')).toBeVisible();
  await expect(section.getByText('System deleted cost-types #3')).toBeVisible();
  const time = section.locator('time').first();
  await expect(time).toHaveText(/^\d+ hours ago$/);
  await time.focus();
  await expect(page.getByRole('tooltip')).toContainText('15 Nov 2026');
});

test('system health lists each component with a status word and an overall badge', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'System health' });
  await expect(section.getByText('Core services healthy · 2 limited')).toBeVisible();
  const rows = section.getByRole('listitem');
  await expect(rows).toHaveCount(6);
  await expect(rows.filter({ hasText: 'Database' })).toContainText('Healthy');
  await expect(rows.filter({ hasText: 'File storage' })).toContainText('Unavailable');
  await expect(rows.filter({ hasText: 'Java runtime' })).toContainText('MPP parsing disabled');
});

test('empty portfolio replaces the charts with an empty state that links to New project', async ({ page }) => {
  await mockApi(page, {
    'GET /dashboard/portfolio': () => ({ projects: [], approval_totals: { draft: 0, submitted: 0, approved: 0, rejected: 0 } }),
  });
  await page.goto('/');
  await ready(page);
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Estimate by project' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Approval status' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'New project' })).toHaveCount(2);
  // The headline cards and the other panels are unaffected.
  await expect(card(page, 'Total estimate')).toContainText('$123.5K');
  await expect(page.getByRole('region', { name: 'System health' })).toBeVisible();
});

test('health endpoint failure shows "Health unavailable", no green ticks and no toast', async ({ page }) => {
  await failWith(page, /\/api\/v1\/dashboard\/health-detailed/);
  await page.goto('/');
  await ready(page);
  const section = page.getByRole('region', { name: 'System health' });
  await expect(section.getByText('Health unavailable')).toBeVisible();
  await expect(section.getByText('Healthy')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  // The rest of the page rendered.
  await expect(page.getByRole('region', { name: 'Estimate by project' })).toBeVisible();
  await expect(card(page, 'Active projects')).toContainText('2');
});

test('stats failure shows an error state with retry while the charts still render', async ({ page }) => {
  let failing = true;
  await page.route(/\/api\/v1\/dashboard\/stats/, (route) => {
    if (!failing) return route.fallback();
    return route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Internal error' }),
    });
  });
  await page.goto('/');
  await expect(page.getByTestId('stats-error')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Estimate by project' }).locator('.MuiBarChart-element')).toHaveCount(10);
  await expect(page.getByRole('region', { name: 'Approval status' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'System health' }).getByText('Core services healthy · 2 limited')).toBeVisible();
  failing = false;
  await page.getByTestId('stats-error').getByRole('button', { name: 'Retry' }).click();
  await expect(card(page, 'Active projects')).toContainText('2');
  await expect(page.getByTestId('stats-error')).toHaveCount(0);
});

test('portfolio failure shows an error state with retry while the headline cards still render', async ({ page }) => {
  await failWith(page, /\/api\/v1\/dashboard\/portfolio/);
  await page.goto('/');
  await expect(page.getByTestId('portfolio-error')).toBeVisible();
  await expect(card(page, 'Total estimate')).toContainText('$123.5K');
  await expect(page.getByRole('region', { name: 'Recent activity' })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`no horizontal scroll and no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
    await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
    await page.goto('/');
    await ready(page);
    expect(await noScroll(page), 'no horizontal page scroll').toBe(true);
    await saveScreenshot(page, testInfo, 'phase-5', `dashboard-${scheme}`);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
  });
}

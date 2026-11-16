import { test, expect, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, loadFixture, type MockApiHandle } from './fixtures/mockApi';
import { reportsRoutes } from './fixtures/reportsRoutes';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-disposition',
};

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, reportsRoutes);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

/** Answer a POST route with a status and JSON body, handling the CORS preflight. */
async function fulfillJson(route: Route, status: number, body: unknown) {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  return route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
}

async function chooseProject(page: Page, name = 'Harbour Bridge Refurbishment') {
  await page.getByRole('combobox', { name: /Project/ }).click();
  await page.getByRole('option', { name }).click();
}

async function openReport(page: Page, url = '/reports') {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
}

test('catalog renders grouped cards and selection is radio-group keyboard navigable', async ({ page }) => {
  await openReport(page);
  await expect(page.getByRole('heading', { name: 'Cost Control Reports' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Audit Reports' })).toBeVisible();
  const group = page.getByRole('radiogroup', { name: 'Report type' });
  await expect(group.getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Set filters' })).toHaveCount(0);

  const first = page.getByRole('radio', { name: /Cost by WBS/ });
  await first.focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-checked', 'true');
  await expect(page).toHaveURL(/report=cost_by_wbs/);

  await page.keyboard.press('ArrowRight');
  const second = page.getByRole('radio', { name: /Cost by Resource/ });
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-checked', 'true');
  await expect(first).toHaveAttribute('aria-checked', 'false');
  await expect(page).toHaveURL(/report=cost_by_resource/);
});

test('filters depend on the report and Generate needs a project', async ({ page }) => {
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await expect(page.getByLabel('Approval status')).toBeVisible();
  await expect(page.getByLabel('Supplier codes')).toBeVisible();
  await expect(page.getByLabel('From date')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled();

  await page.getByRole('radio', { name: /Change History/ }).click();
  await expect(page.getByLabel('From date')).toBeVisible();
  await expect(page.getByLabel('Approval status')).toHaveCount(0);

  await page.getByRole('radio', { name: /Risk Summary/ }).click();
  await expect(page.getByLabel('From date')).toHaveCount(0);
  await expect(page.getByLabel('Approval status')).toHaveCount(0);

  await chooseProject(page);
  await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled();
});

test('generate sends the expected request and renders the preview with totals', async ({ page }, testInfo) => {
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await page.getByLabel('Resource codes').fill('RES001, RES002');

  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/reports/generate') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Generate' }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toEqual({
    report_type: 'cost_by_wbs',
    filters: { project_id: 1, resource_codes: ['RES001', 'RES002'] },
  });

  await expect(page.getByRole('heading', { name: 'Cost by WBS', level: 3 })).toBeVisible();
  await expect(page.getByText(/3 rows/)).toBeVisible();
  await expect(page.getByText(/Generated 4 Mar 2026/)).toBeVisible();
  const grid = page.getByRole('grid', { name: 'Cost by WBS report data' });
  await expect(grid.getByText('Pier foundations')).toBeVisible();
  await expect(grid.getByText('$150,000.00')).toBeVisible();
  const totals = page.getByRole('group', { name: 'Report totals' }).or(page.getByLabel('Report totals'));
  await expect(totals).toContainText('$318,750.08');
  await expect(totals).toContainText('19');
  await saveScreenshot(page, testInfo, 'phase-4', 'reports-preview-light');
});

test('changing filters after generating shows a stale notice and disables export', async ({ page }) => {
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeEnabled();
  await page.getByLabel('Supplier codes').fill('SUP01');
  await expect(page.getByText(/Filters have changed/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeDisabled();
});

test('audit report sends dates only and rejects an inverted range', async ({ page }) => {
  await openReport(page);
  await page.getByRole('radio', { name: /Change History/ }).click();
  await chooseProject(page);
  await page.getByLabel('From date').fill('2026-02-10');
  await page.getByLabel('To date').fill('2026-02-01');
  await expect(page.getByText('End date must be on or after the start date')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled();
  await page.getByLabel('To date').fill('2026-02-20');

  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/reports/generate'));
  await page.getByRole('button', { name: 'Generate' }).click();
  expect((await requestPromise).postDataJSON()).toEqual({
    report_type: 'change_history',
    filters: { project_id: 1, date_from: '2026-02-10', date_to: '2026-02-20' },
  });
});

test('export: menu lists formats, posts the request, starts a download and toasts', async ({ page }, testInfo) => {
  await page.route('**/api/v1/reports/export', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-disposition': 'attachment; filename="cost-by-wbs-test.xlsx"' },
      contentType: 'application/octet-stream',
      body: Buffer.from('PK-test'),
    });
  });
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeDisabled();
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeEnabled();

  await page.getByRole('button', { name: 'Choose export format' }).click();
  for (const label of ['PDF', 'XLSX', 'DOCX', 'CSV']) {
    await expect(page.getByRole('menuitem', { name: new RegExp(`^${label}`) })).toBeVisible();
  }
  await saveScreenshot(page, testInfo, 'phase-4', 'reports-export-menu-light');

  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/reports/export') && r.method() === 'POST');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /^XLSX/ }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toEqual({
    report_type: 'cost_by_wbs',
    filters: { project_id: 1 },
    export_format: 'xlsx',
  });
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('cost-by-wbs-test.xlsx');
  await expect(page.getByText('Exported cost-by-wbs-test.xlsx (XLSX)')).toBeVisible();
});

test('export failure raises one error toast', async ({ page }) => {
  await page.route('**/api/v1/reports/export', (route) => fulfillJson(route, 500, { detail: 'boom' }));
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeEnabled();
});

test('a report with zero rows shows the empty state and disables export', async ({ page }) => {
  await page.route('**/api/v1/reports/generate', (route) =>
    fulfillJson(route, 200, { ...loadFixture<object>('reports-result'), rows: [], totals: null, row_count: 0 }),
  );
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByText('No data for these filters')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeDisabled();
});

test('generate failure shows an error state with retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/reports/generate', (route) =>
    fail ? fulfillJson(route, 500, { detail: 'boom' }) : fulfillJson(route, 200, loadFixture('reports-result')),
  );
  await openReport(page);
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await chooseProject(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByText('Could not generate the report')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(1); // the global toast, no second one
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('grid', { name: 'Cost by WBS report data' })).toBeVisible();
});

test('catalog failure shows an error state with retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/reports/catalog', (route) =>
    fail ? fulfillJson(route, 500, { detail: 'boom' }) : fulfillJson(route, 200, loadFixture('reports-catalog')),
  );
  await openReport(page);
  await expect(page.getByText('Could not load the report catalog')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('radio', { name: /Cost by WBS/ })).toBeVisible();
});

test('a bookmarked URL restores the report and filters', async ({ page }) => {
  await openReport(page, '/reports?report=cost_by_resource&project=2&status=approved&suppliers=SUP01');
  await expect(page.getByRole('radio', { name: /Cost by Resource/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('combobox', { name: /Project/ })).toHaveText('Data Centre Fit-out');
  await expect(page.getByRole('combobox', { name: 'Approval status' })).toHaveText('Approved');
  await expect(page.getByLabel('Supplier codes')).toHaveValue('SUP01');

  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/reports/generate'));
  await page.getByRole('button', { name: 'Generate' }).click();
  expect((await requestPromise).postDataJSON()).toEqual({
    report_type: 'cost_by_resource',
    filters: { project_id: 2, approval_status: 'approved', supplier_codes: ['SUP01'] },
  });
});

test('an unknown report in the URL is ignored', async ({ page }) => {
  await openReport(page, '/reports?report=nope');
  await expect(page.getByRole('heading', { name: 'Set filters' })).toHaveCount(0);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`preview has no horizontal page scroll and no serious axe violations (${scheme})`, async ({ page }, testInfo) => {
    await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
    await openReport(page);
    await page.getByRole('radio', { name: /Cost by WBS/ }).click();
    await chooseProject(page);
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('grid', { name: 'Cost by WBS report data' })).toBeVisible();
    await expect(page.getByLabel('Report totals')).toBeVisible();
    await page.waitForTimeout(500);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) })),
    ).toEqual([]);
    await saveScreenshot(page, testInfo, 'phase-4', `reports-${scheme}`);
  });
}

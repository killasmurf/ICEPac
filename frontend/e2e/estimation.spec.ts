import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { estimationRoutes } from './fixtures/estimationRoutes';
import { saveScreenshot } from './fixtures/screenshot';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page, estimationRoutes);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Narrow screens virtualise off-screen grid columns, so scroll the grid to the right to reach the last ones. */
async function scrollGridRight(grid: Locator) {
  await grid.locator('.MuiDataGrid-virtualScroller').evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
}

/** The project page keeps its tab in the URL (?tab=summary|risks|wbs|imports). */
async function openTab(page: Page, tab: 'summary' | 'risks') {
  await page.goto(`/projects/1?tab=${tab}`);
}

const json = (body: unknown, status = 200) => ({
  status,
  headers: { 'access-control-allow-origin': '*' },
  contentType: 'application/json',
  body: JSON.stringify(body),
});

test.describe('estimation summary', () => {
  test('renders stat cards, the 80% range and the WBS table', async ({ page }, testInfo) => {
    await openTab(page, 'summary');
    await expect(page.getByText('Total PERT Estimate', { exact: true })).toBeVisible();
    await expect(page.getByText('$1,186,000.00 to $1,314,000.00')).toBeVisible();
    const wbs = page.getByRole('grid', { name: 'WBS cost summary' });
    await expect(wbs.getByText('Foundations')).toBeVisible();
    await scrollGridRight(wbs);
    await expect(wbs.getByText('Approved')).toBeVisible();
    await expect(wbs.getByText('Rejected')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'estimation-summary-light');
  });

  test('shows an empty state', async ({ page }) => {
    await page.route('**/api/v1/projects/1/estimation', (r) =>
      r.fulfill(json({ ...(estimationRoutes['GET /projects/1/estimation'] as () => object)(), total_wbs_items: 0, total_assignments: 0, wbs_summaries: [] })),
    );
    await openTab(page, 'summary');
    await expect(page.getByText('No estimation data yet')).toBeVisible();
  });

  test('shows an error state with retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/v1/projects/1/estimation', (r) =>
      fail ? r.fulfill(json({ detail: 'boom' }, 500)) : r.fulfill(json((estimationRoutes['GET /projects/1/estimation'] as () => object)())),
    );
    await openTab(page, 'summary');
    await expect(page.getByText('Could not load the estimation summary')).toBeVisible({ timeout: 15_000 });
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Total PERT Estimate', { exact: true })).toBeVisible();
  });
});

test.describe('project risk register', () => {
  test('renders rows from the API', async ({ page }, testInfo) => {
    await openTab(page, 'risks');
    await expect(page.getByText('Steel price escalation')).toBeVisible();
    await expect(page.getByRole('gridcell', { name: '$125,001' })).toBeVisible();
    await scrollGridRight(page.getByRole('grid', { name: 'Project risk register' }));
    await expect(page.getByText('Open', { exact: true })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, 'phase-4', 'risk-register-light');
  });

  test('shows an empty state', async ({ page }) => {
    await page.route('**/api/v1/projects/1/risks', (r) =>
      r.request().method() === 'GET' ? r.fulfill(json({ items: [], total: 0 })) : r.fallback(),
    );
    await openTab(page, 'risks');
    await expect(page.getByText('No project-level risks recorded yet')).toBeVisible();
  });

  test('shows an error state', async ({ page }) => {
    await page.route('**/api/v1/projects/1/risks', (r) => r.fulfill(json({ detail: 'boom' }, 500)));
    await openTab(page, 'risks');
    await expect(page.getByText('Could not load the risk register')).toBeVisible({ timeout: 15_000 });
  });

  test('create sends the expected request and toasts', async ({ page }) => {
    await openTab(page, 'risks');
    await page.getByRole('button', { name: 'Add Project Risk' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add Project Risk' });
    await dialog.getByRole('textbox', { name: /Title/ }).fill('Permit delay');
    await dialog.getByLabel('Risk Cost').fill('5000');
    const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/projects/1/risks'));
    await dialog.getByRole('button', { name: 'Create Risk' }).click();
    const body = (await request).postDataJSON();
    expect(body).toMatchObject({ title: 'Permit delay', risk_cost: 5000, status: 'open' });
    await expect(page.getByText('Project risk created')).toBeVisible();
  });

  test('edit sends a PUT and toasts', async ({ page }) => {
    await openTab(page, 'risks');
    await scrollGridRight(page.getByRole('grid', { name: 'Project risk register' }));
    await page.getByRole('button', { name: 'Edit risk Steel price escalation' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Project Risk' });
    await dialog.getByLabel('Risk Cost').fill('99000');
    const request = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/projects/1/risks/7'));
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    expect((await request).postDataJSON()).toMatchObject({ title: 'Steel price escalation', risk_cost: 99000 });
    await expect(page.getByText('Project risk updated')).toBeVisible();
  });

  test('delete asks for confirmation, sends a DELETE and toasts', async ({ page }) => {
    await openTab(page, 'risks');
    await scrollGridRight(page.getByRole('grid', { name: 'Project risk register' }));
    await page.getByRole('button', { name: 'Delete risk Steel price escalation' }).click();
    const request = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/projects/1/risks/7'));
    await page.getByRole('dialog', { name: 'Delete project risk?' }).getByRole('button', { name: 'Delete' }).click();
    await request;
    await expect(page.getByText('Project risk deleted')).toBeVisible();
  });
});

test.describe('WBS detail panel', () => {
  async function openPanel(page: Page) {
    await page.goto('/projects/1?tab=wbs&wbs=11');
    await expect(page.getByRole('grid', { name: 'Resource assignments' })).toBeVisible();
  }

  test('lists assignments with a range bar', async ({ page }, testInfo) => {
    await openPanel(page);
    const grid = page.getByRole('grid', { name: 'Resource assignments' });
    await expect(grid.getByText('ENG')).toBeVisible();
    await scrollGridRight(grid);
    await expect(grid.getByRole('img', { name: /Best case \$100\.00/ })).toBeVisible();
    await saveScreenshot(page, testInfo, 'phase-4', 'wbs-panel-light');
  });

  test('creating an assignment sends the expected request and toasts', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('button', { name: 'Add Assignment' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Assignment' });
    await dialog.getByRole('combobox', { name: /Resource/ }).click();
    await page.getByRole('option', { name: 'ENG - Engineer' }).click();
    await dialog.getByLabel('Best Estimate').fill('100');
    await dialog.getByLabel('Likely Estimate').fill('200');
    await dialog.getByLabel('Worst Estimate').fill('400');
    await expect(dialog.getByTestId('pert-preview')).toContainText('$216.67');
    const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/projects/1/wbs/11/assignments'));
    await dialog.getByRole('button', { name: 'Create' }).click();
    expect((await request).postDataJSON()).toMatchObject({ resource_code: 'ENG', best_estimate: 100, likely_estimate: 200, worst_estimate: 400 });
    await expect(page.getByText('Assignment created')).toBeVisible();
  });

  test('invalid three-point values disable submit', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('button', { name: 'Add Assignment' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Assignment' });
    await dialog.getByLabel('Best Estimate').fill('500');
    await dialog.getByLabel('Likely Estimate').fill('200');
    await expect(dialog.getByText('Best must not be more than likely')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('deleting an assignment confirms, sends a DELETE and toasts', async ({ page }) => {
    await openPanel(page);
    await scrollGridRight(page.getByRole('grid', { name: 'Resource assignments' }));
    await page.getByRole('button', { name: 'Delete assignment ENG' }).click();
    const request = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().endsWith('/projects/1/wbs/11/assignments/1'));
    await page.getByRole('dialog', { name: 'Delete assignment?' }).getByRole('button', { name: 'Delete' }).click();
    await request;
    await expect(page.getByText('Assignment deleted')).toBeVisible();
  });

  test('admin can submit for approval', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('tab', { name: 'Approval' }).click();
    await expect(page.getByLabel('Approval progress')).toBeVisible();
    await page.route('**/api/v1/projects/1/wbs/11/approval', (r) =>
      r.request().method() === 'POST'
        ? r.fulfill(json({ wbs_id: 11, approval_status: 'submitted', approver: null, approver_date: null, estimate_revision: 0 }))
        : r.fallback(),
    );
    const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/wbs/11/approval'));
    await page.getByRole('button', { name: 'Submit for Approval' }).click();
    expect((await request).postDataJSON()).toMatchObject({ action: 'submit' });
    await expect(page.getByText('Submitted for approval')).toBeVisible();
  });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, tab] of [['estimation', 'summary'], ['risk-register', 'risks']] as const) {
    test(`no serious or critical axe violations: ${name} (${scheme})`, async ({ page }, testInfo) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      await openTab(page, tab);
      await expect(page.getByRole('grid').first()).toBeVisible();
      await page.waitForTimeout(500);
      if (scheme === 'dark') await saveScreenshot(page, testInfo, 'phase-4', `${name}-dark`);
      const results = await new AxeBuilder({ page }).include('main').analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
    });
  }
}

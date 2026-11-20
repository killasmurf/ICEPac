import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { assignment, estimationRoutes, wbsRisk } from './fixtures/estimationRoutes';
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
  test('renders the 80% range, the WBS table and the headline cards (unless hidden)', async ({ page }, testInfo) => {
    await openTab(page, 'summary');
    await expect(page.getByRole('heading', { name: '80% Confidence Range' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: '80% Confidence Range' })).toBeVisible();
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

  test('the inline panel at desktop width shows PERT and Range without scrolling and singularises counts (F-16)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'the inline panel is desktop only');
    await openPanel(page);
    const grid = page.getByRole('grid', { name: 'Resource assignments' });
    await expect(grid.getByText('ENG')).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'PERT' })).toBeInViewport({ ratio: 1 });
    await expect(grid.getByRole('columnheader', { name: 'Range' })).toBeInViewport({ ratio: 1 });
    await expect(grid.getByRole('columnheader', { name: 'Std Dev' })).toHaveCount(0);
    await expect(grid.getByRole('columnheader', { name: 'Supplier' })).toHaveCount(0);
    const overflow = await grid.locator('.MuiDataGrid-virtualScroller').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('group', { name: 'Assignment totals' })).toContainText('Totals (1 assignment)');
    await expect(page.getByText('1 assignments')).toHaveCount(0);
    await saveScreenshot(page, testInfo, 'phase-4', 'wbs-inline-panel-light');
  });

  test('inline panel in dark mode (screenshot review)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'the inline panel is desktop only');
    await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
    await openPanel(page);
    const grid = page.getByRole('grid', { name: 'Resource assignments' });
    await expect(grid.getByText('ENG')).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: 'PERT' })).toBeInViewport({ ratio: 1 });
    await saveScreenshot(page, testInfo, 'phase-4', 'wbs-inline-panel-dark');
  });

  test('totals strip sums Decimal strings instead of showing NaN (F-14)', async ({ page }) => {
    const two = [
      { ...assignment, id: 1, best_estimate: '12000.00', likely_estimate: '15000.00', worst_estimate: '24000.00', pert_estimate: 15999.99, std_deviation: 2000 },
      { ...assignment, id: 2, resource_code: 'PMO', best_estimate: '1000.50', likely_estimate: '2000.25', worst_estimate: '3000.00', pert_estimate: 2000.25, std_deviation: 333.33 },
    ];
    await page.route('**/api/v1/projects/1/wbs/11/assignments', (r) =>
      r.request().method() === 'GET' ? r.fulfill(json({ items: two, total: 2 })) : r.fallback(),
    );
    await openPanel(page);
    const totals = page.getByRole('group', { name: 'Assignment totals' });
    await expect(totals).toContainText('Totals (2 assignments)');
    await expect(totals).toContainText('$13,000.50');
    await expect(totals).toContainText('$17,000.25');
    await expect(totals).toContainText('$27,000.00');
    await expect(totals).not.toContainText('NaN');
  });

  test('a plain user gets populated dropdowns and can add a WBS risk with a title (F-05, F-07)', async ({ page }, testInfo) => {
    await loginAs(page, 'user');
    await openPanel(page);
    await (testInfo.project.name === 'mobile' ? page.getByRole('dialog') : page.getByTestId('wbs-detail')).getByRole('tab', { name: 'Risks' }).click();
    await expect(page.getByText('Integration slips')).toBeVisible();
    await page.getByRole('button', { name: 'Add Risk' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Risk' });
    await dialog.getByLabel(/^Title/).focus();
    await dialog.getByLabel('Risk Cost').focus();
    await expect(dialog.getByText('Title is required')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
    await dialog.getByLabel(/^Title/).fill('Vendor slips');
    await dialog.getByRole('combobox', { name: /Risk Category/ }).click();
    await page.getByRole('option', { name: 'TECH - Technical' }).click();
    await dialog.getByRole('combobox', { name: 'Probability' }).click();
    await expect(page.getByRole('option', { name: 'Medium (50%)' })).toBeVisible();
    await page.getByRole('option', { name: 'Medium (50%)' }).click();
    await dialog.screenshot({ path: `e2e/__screenshots__/phase-4/risk-form-${test.info().project.name}.png` });
    await page.route('**/api/v1/projects/1/wbs/11/risks', (r) =>
      r.request().method() === 'POST' ? r.fulfill(json({ ...wbsRisk, id: 6, title: 'Vendor slips' }, 201)) : r.fallback(),
    );
    const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/wbs/11/risks'));
    await dialog.getByRole('button', { name: 'Create' }).click();
    expect((await request).postDataJSON()).toMatchObject({ title: 'Vendor slips', status: 'open', risk_category_code: 'TECH', probability_code: 'M' });
    await expect(page.getByText('Risk created')).toBeVisible();
  });

  test('the resource dropdown is populated for a plain user (F-07)', async ({ page }) => {
    await loginAs(page, 'user');
    await openPanel(page);
    await page.getByRole('button', { name: 'Add Assignment' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Assignment' });
    await dialog.getByRole('combobox', { name: /Resource/ }).click();
    await expect(page.getByRole('option', { name: 'ENG - Engineer' })).toBeVisible();
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

// Crossing the md breakpoint (900 px) swaps the inline split pane for a drawer, which remounts the detail panel.
// The tab, the open form and what was typed in it must survive.
test.describe('WBS detail panel keeps an open form across layout changes', () => {
  const DESKTOP = { width: 1280, height: 900 };
  const TABLET_PORTRAIT = { width: 800, height: 1100 };

  test.beforeEach(async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    test.skip(testInfo.project.name === 'mobile', 'sets its own viewport sizes');
  });

  async function openRisksTab(page: Page, viewport: { width: number; height: number }) {
    await page.setViewportSize(viewport);
    await page.goto('/projects/1?tab=wbs&wbs=11');
    await expect(page.getByRole('grid', { name: 'Resource assignments' })).toBeVisible();
    await page.locator('#wbs-tab-1').click();
  }

  async function fillRiskForm(page: Page) {
    await page.getByRole('button', { name: 'Add Risk' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New Risk' });
    await dialog.getByLabel(/^Title/).fill('Crane availability');
    await dialog.getByLabel('Risk Cost').fill('1234.5');
    await dialog.getByRole('combobox', { name: /Risk Category/ }).click();
    await page.getByRole('option', { name: 'TECH - Technical' }).click();
    return dialog;
  }

  async function expectRiskDraft(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'New Risk' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/^Title/)).toHaveValue('Crane availability');
    await expect(dialog.getByLabel('Risk Cost')).toHaveValue('1234.5');
    await expect(dialog.getByRole('combobox', { name: /Risk Category/ })).toContainText('TECH');
    await expect(page.locator('#wbs-tab-1')).toHaveAttribute('aria-selected', 'true');
  }

  test('risk form: desktop to tablet portrait and back', async ({ page }, testInfo) => {
    await openRisksTab(page, DESKTOP);
    await fillRiskForm(page);
    await page.setViewportSize(TABLET_PORTRAIT);
    await expectRiskDraft(page);
    await saveScreenshot(page, testInfo, 'closeout', 'form-kept-tablet');
    await page.setViewportSize(DESKTOP);
    await expectRiskDraft(page);
  });

  test('risk form: started on tablet portrait, rotated to landscape', async ({ page }) => {
    await openRisksTab(page, TABLET_PORTRAIT);
    await fillRiskForm(page);
    await page.setViewportSize({ width: 1100, height: 800 });
    await expectRiskDraft(page);
  });

  test('a submitted form clears its draft', async ({ page }) => {
    await openRisksTab(page, DESKTOP);
    await fillRiskForm(page);
    await page.route('**/api/v1/projects/1/wbs/11/risks', (r) =>
      r.request().method() === 'POST' ? r.fulfill(json({ ...wbsRisk, id: 9, title: 'Crane availability' }, 201)) : r.fallback(),
    );
    const request = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/wbs/11/risks'));
    await page.getByRole('dialog', { name: 'New Risk' }).getByRole('button', { name: 'Create' }).click();
    expect((await request).postDataJSON()).toMatchObject({ title: 'Crane availability', risk_cost: 1234.5 });
    await expect(page.getByText('Risk created')).toBeVisible();
    await page.setViewportSize(TABLET_PORTRAIT);
    await expect(page.getByRole('dialog', { name: 'New Risk' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Add Risk' }).first().click();
    await expect(page.getByRole('dialog', { name: 'New Risk' }).getByLabel(/^Title/)).toHaveValue('');
  });

  test('assignment form: desktop to tablet portrait and back', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/projects/1?tab=wbs&wbs=11');
    await expect(page.getByRole('grid', { name: 'Resource assignments' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Assignment' }).first().click();
    const typed = async () => {
      const dialog = page.getByRole('dialog', { name: 'New Assignment' });
      await expect(dialog.getByLabel('Best Estimate')).toHaveValue('100');
      await expect(dialog.getByLabel('Likely Estimate')).toHaveValue('200');
      await expect(dialog.getByLabel('Worst Estimate')).toHaveValue('400');
      await expect(dialog.getByRole('combobox', { name: /Resource/ })).toContainText('ENG');
      await expect(page.locator('#wbs-tab-0')).toHaveAttribute('aria-selected', 'true');
    };
    const dialog = page.getByRole('dialog', { name: 'New Assignment' });
    await dialog.getByRole('combobox', { name: /Resource/ }).click();
    await page.getByRole('option', { name: 'ENG - Engineer' }).click();
    await dialog.getByLabel('Best Estimate').fill('100');
    await dialog.getByLabel('Likely Estimate').fill('200');
    await dialog.getByLabel('Worst Estimate').fill('400');
    await page.setViewportSize(TABLET_PORTRAIT);
    await typed();
    await page.setViewportSize(DESKTOP);
    await typed();
  });
});

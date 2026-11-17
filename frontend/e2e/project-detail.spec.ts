import { test, expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, loadFixture, MockApiHandle } from './fixtures/mockApi';
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

const isMobile = (name: string) => name === 'mobile';
const tree = (page: Page) => page.getByRole('tree', { name: 'Work breakdown structure' });
const item = (page: Page, name: RegExp | string) => tree(page).getByRole('treeitem', { name });

async function failWith(page: Page, pattern: RegExp, status: number) {
  await page.route(pattern, (route) =>
    route.fulfill({
      status,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ detail: status === 404 ? 'Project not found' : 'Internal error' }),
    }),
  );
}

test('renders the header, stat cards and WBS tree from fixtures', async ({ page }, testInfo) => {
  await page.goto('/projects/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Harbour Bridge Refurbishment' })).toBeVisible();
  const header = page.getByRole('region', { name: 'Project summary' });
  await expect(header.getByText('Imported', { exact: true })).toBeVisible();
  await expect(header.getByText('$1,250,000')).toBeVisible();
  await expect(header.getByText('$1.1M – $1.4M')).toBeVisible();
  await expect(header.getByText('Total PERT estimate')).toBeVisible();
  await expect(header.getByText('WBS items')).toBeVisible();
  await expect(header.getByText('Risks', { exact: true })).toBeVisible();

  await expect(page.getByRole('tab', { name: 'WBS (9)' })).toHaveAttribute('aria-selected', 'true');
  await expect(item(page, /Site Preparation/)).toHaveAttribute('aria-level', '1');
  await expect(item(page, /Site Preparation/)).toHaveAttribute('aria-expanded', 'true');
  await expect(item(page, /Survey and Setout/)).toHaveAttribute('aria-level', '2');
  await expect(item(page, /Earthworks/)).toHaveAttribute('aria-expanded', 'false');
  await expect(item(page, /Handover/)).not.toHaveAttribute('aria-expanded');
  // Approval status and PERT total from the estimation summary.
  await expect(item(page, /Steelwork/)).toContainText('Submitted');
  await expect(item(page, /Steelwork/)).toContainText('$410,000');
  await expect(item(page, /Concrete Pour Complete/)).toContainText('Approved');
  await expect(item(page, /Concrete Pour Complete/)).toContainText('Milestone');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await saveScreenshot(page, testInfo, 'phase-4', 'project-detail-light');
});

test('tab switching updates the URL and survives a reload', async ({ page }) => {
  await page.goto('/projects/1');
  await page.getByRole('tab', { name: 'Summary' }).click();
  await expect(page).toHaveURL(/\/projects\/1\?tab=summary$/);
  await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true');

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/tab=summary/);

  await page.getByRole('tab', { name: 'Risks' }).click();
  await expect(page).toHaveURL(/tab=risks/);
  await page.getByRole('tab', { name: 'Imports' }).click();
  await expect(page).toHaveURL(/tab=imports/);
  await expect(page.getByText(/drag|drop|browse/i).first()).toBeVisible();

  await page.getByRole('tab', { name: /^WBS/ }).click();
  await expect(page).toHaveURL(/\/projects\/1$/);
  await expect(tree(page)).toBeVisible();
});

test('an unknown tab value falls back to WBS', async ({ page }) => {
  await page.goto('/projects/1?tab=bogus');
  await expect(page.getByRole('tab', { name: /^WBS/ })).toHaveAttribute('aria-selected', 'true');
  await expect(tree(page)).toBeVisible();
});

/** The estimate editor: an inline pane beside the tree on desktop, a drawer on mobile. */
const detail = (page: Page, testInfo: TestInfo) =>
  isMobile(testInfo.project.name) ? page.locator('.MuiDrawer-paper') : page.locator('section[aria-labelledby]').filter({ has: page.getByRole('tab', { name: 'Assignments' }) });

test('selecting a WBS node opens the detail panel and keeps the id in the URL', async ({ page }, testInfo) => {
  await page.goto('/projects/1');
  await page.getByRole('button', { name: 'Expand all' }).click();
  await item(page, /Excavation/).click();
  await expect(page).toHaveURL(/wbs=4/);
  await expect(page.locator('[data-wbs-id="4"]')).toHaveAttribute('aria-selected', 'true');
  const drawer = detail(page, testInfo);
  await expect(drawer.getByRole('heading', { name: 'Excavation' })).toBeVisible();
  await expect(drawer.getByRole('tab', { name: 'Assignments' })).toBeVisible();
  await saveScreenshot(page, testInfo, 'phase-4', 'project-detail-wbs-selected-light');

  // Reload restores the selection.
  await page.reload();
  await expect(detail(page, testInfo).getByRole('heading', { name: 'Excavation' })).toBeVisible();
});

test('desktop: split view shows a prompt, then the inline estimate editor', async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), 'split view is md and up');
  await page.goto('/projects/1');
  await expect(page.getByText('Select a WBS item')).toBeVisible();
  await expect(page.getByRole('separator')).toBeVisible();
  const treeBox = await tree(page).boundingBox();
  expect(treeBox?.width ?? 0).toBeGreaterThanOrEqual(280);

  await item(page, /Steelwork/).click();
  const pane = detail(page, testInfo);
  await expect(pane.getByRole('heading', { name: 'Steelwork' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const paneBox = await pane.boundingBox();
  const treeAfter = await tree(page).boundingBox();
  expect(paneBox?.x ?? 0).toBeGreaterThanOrEqual((treeAfter?.x ?? 0) + (treeAfter?.width ?? 0) - 1);
  await pane.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Select a WBS item')).toBeVisible();
});

test('mobile: tree is full width and the detail opens in a full-width drawer', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile only');
  await page.goto('/projects/1');
  await expect(page.getByText('Select a WBS item')).toHaveCount(0);
  await expect(page.getByRole('separator')).toHaveCount(0);
  const treeBox = await tree(page).boundingBox();
  expect(treeBox?.width ?? 0).toBeGreaterThan(330);

  await item(page, /Handover/).click();
  const paper = page.locator('.MuiDrawer-paper');
  await expect(paper.getByRole('heading', { name: 'Handover' })).toBeVisible();
  const box = await paper.boundingBox();
  expect(box?.width).toBe(390);
  expect(box?.height).toBe(844);
  await saveScreenshot(page, testInfo, 'phase-4', 'project-detail-drawer-light');
});

test('keyboard navigation follows the tree pattern', async ({ page }) => {
  await page.goto('/projects/1');
  const site = item(page, /Site Preparation/);
  await site.focus();
  await expect(site).toHaveAttribute('tabindex', '0');
  await expect(item(page, /Handover/)).toHaveAttribute('tabindex', '-1');

  await page.keyboard.press('ArrowDown');
  await expect(item(page, /Survey and Setout/)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(item(page, /Earthworks/)).toBeFocused();
  await page.keyboard.press('ArrowRight'); // expand
  await expect(item(page, /Earthworks/)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight'); // first child
  await expect(item(page, /Excavation/)).toBeFocused();
  await expect(item(page, /Excavation/)).toHaveAttribute('aria-level', '3');
  await page.keyboard.press('ArrowLeft'); // to parent
  await expect(item(page, /Earthworks/)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); // collapse
  await expect(item(page, /Earthworks/)).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowLeft'); // to parent
  await expect(site).toBeFocused();
  await page.keyboard.press('End');
  await expect(item(page, /Handover/)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(site).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/wbs=1/);
  await expect(page.locator('[data-wbs-id="1"]')).toHaveAttribute('aria-selected', 'true'); // tree is aria-hidden behind the modal
});

test('filter keeps ancestors of matches visible, and Expand/Collapse all work', async ({ page }) => {
  await page.goto('/projects/1');
  await page.getByRole('searchbox', { name: 'Filter WBS' }).fill('backfill');
  await expect(item(page, /Backfill and Compaction/)).toBeVisible();
  await expect(item(page, /Earthworks/)).toBeVisible(); // ancestor
  await expect(item(page, /Site Preparation/)).toBeVisible(); // ancestor
  await expect(item(page, /Steelwork/)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'match' })).toContainText('1 of 9');

  await page.getByRole('searchbox', { name: 'Filter WBS' }).fill('zzz');
  await expect(page.getByText(/No WBS items match/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Filter WBS' }).fill('');
  await expect(item(page, /Handover/)).toBeVisible();

  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(tree(page).getByRole('treeitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(tree(page).getByRole('treeitem')).toHaveCount(9);
});

test('editing the details sends a PUT and shows a toast', async ({ page }) => {
  await page.goto('/projects/1');
  await page.getByRole('button', { name: 'Edit details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit project details' });
  await dialog.getByLabel('Project name').fill('Harbour Bridge Stage 2');
  const request = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/api/v1/projects/1'));
  await dialog.getByRole('button', { name: 'Save' }).click();
  expect((await request).postDataJSON()).toEqual({
    project_name: 'Harbour Bridge Stage 2',
    project_manager: 'Jordan Lee',
    description: 'Structural refurbishment and repainting programme.',
  });
  await expect(page.getByText('Project updated.')).toBeVisible();
  await expect(dialog).toBeHidden();
});

test('editing requires a project name', async ({ page }) => {
  await page.goto('/projects/1');
  await page.getByRole('button', { name: 'Edit details' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit project details' });
  await dialog.getByLabel('Project name').fill('');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText('Project name is required.')).toBeVisible();
});

test('an empty WBS shows an empty state that links to the import tab', async ({ page }) => {
  await page.route(/\/api\/v1\/projects\/1\/wbs\/tree$/, (route) =>
    route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    }),
  );
  await page.goto('/projects/1');
  await expect(page.getByRole('heading', { name: 'No WBS yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Import a project file' }).click();
  await expect(page).toHaveURL(/tab=imports/);
});

test('a failing WBS request shows an error state with Retry', async ({ page }) => {
  let fail = true;
  await page.route(/\/api\/v1\/projects\/1\/wbs\/tree$/, (route) =>
    fail
      ? route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{"detail":"x"}' })
      : route.fulfill({
          status: 200,
          headers: { 'access-control-allow-origin': '*' },
          contentType: 'application/json',
          body: JSON.stringify(loadFixture('project-detail-wbs-tree')),
        }),
  );
  await page.goto('/projects/1');
  await expect(page.getByRole('heading', { name: 'Could not load the WBS' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(tree(page)).toBeVisible();
});

test('a missing project shows a not-found state with a link back', async ({ page }) => {
  await failWith(page, /\/api\/v1\/projects\/99$/, 404);
  await page.goto('/projects/99');
  await expect(page.getByRole('heading', { name: 'Project not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Projects' }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test('a server error on the project shows a retry state', async ({ page }) => {
  await failWith(page, /\/api\/v1\/projects\/1$/, 500);
  await page.goto('/projects/1');
  await expect(page.getByRole('heading', { name: 'Could not load the project' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`no serious or critical axe violations (${scheme})`, async ({ page }, testInfo) => {
    await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
    await page.goto('/projects/1');
    await expect(tree(page)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (scheme === 'dark') await saveScreenshot(page, testInfo, 'phase-4', 'project-detail-dark');
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.any[0]?.message ?? '')) }))).toEqual([]);

    await item(page, /Steelwork/).click();
    await expect(detail(page, testInfo).getByRole('heading', { name: 'Steelwork' })).toBeVisible();
    await page.waitForTimeout(500);
    const panelResults = await new AxeBuilder({ page }).analyze();
    const panelBlocking = panelResults.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(panelBlocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
  });
}

test('summary tab: no duplicated headline cards and the WBS Summary table is not clipped', async ({ page }, testInfo) => {
  await page.goto('/projects/1?tab=summary');
  await expect(page.getByRole('heading', { name: '80% Confidence Range' })).toBeVisible();
  // The header band is the only place for the headline totals.
  await expect(page.getByText('Total PERT estimate', { exact: false })).toHaveCount(1);
  await expect(page.getByText('Risk-Adjusted Estimate')).toHaveCount(0);

  const grid = page.getByRole('grid', { name: 'WBS cost summary' });
  await expect(grid.getByRole('columnheader', { name: 'WBS Code' })).toBeVisible();
  test.skip(isMobile(testInfo.project.name), 'the table legitimately scrolls inside its own container on phones');
  // Nothing may overflow the grid, otherwise focus can scroll it sideways and clip the first column.
  const overflow = await grid.locator('.MuiDataGrid-virtualScroller').evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, sl: el.scrollLeft }));
  expect(overflow.sw).toBeLessThanOrEqual(overflow.cw);
  await grid.getByRole('columnheader', { name: 'WBS Code' }).focus();
  const after = await grid.locator('.MuiDataGrid-virtualScroller').evaluate((el) => el.scrollLeft);
  expect(after).toBe(0);
  const box = await grid.getByRole('columnheader', { name: 'WBS Code' }).boundingBox();
  const gridBox = await grid.boundingBox();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(gridBox?.x ?? 0);
  await saveScreenshot(page, testInfo, 'phase-4', 'project-detail-summary-light');
});

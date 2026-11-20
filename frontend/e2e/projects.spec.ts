import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { projectsRoutes } from './fixtures/projectsRoutes';
import { saveScreenshot } from './fixtures/screenshot';

const PHASE = 'phase-4';
let api: MockApiHandle;

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

async function setup(page: Page, opts: { many?: boolean; scheme?: 'light' | 'dark'; view?: 'cards' | 'table' } = {}) {
  api = await mockApi(page, opts.many ? projectsRoutes({ many: true }) : {});
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ([scheme, view]) => {
      window.localStorage.setItem('mui-mode', scheme as string);
      if (view) window.localStorage.setItem('icepac.projectsView', view as string);
    },
    [opts.scheme ?? 'light', opts.view ?? null],
  );
  await loginAs(page, 'admin');
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(overflow).toBe(true);
}

async function axeBlocking(page: Page) {
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }));
}

test.describe('projects list', () => {
  test('renders cards from fixtures, light and dark', async ({ page }, testInfo) => {
    await setup(page);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toBeVisible();
    await expect(page.getByText('142 tasks')).toBeVisible();
    await expect(page.getByText('Imported')).toBeVisible();
    await expect(page.getByText('2 projects')).toBeVisible();
    await noHorizontalScroll(page);
    await saveScreenshot(page, testInfo, PHASE, 'projects-cards-light');
    expect(await axeBlocking(page)).toEqual([]);

    await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
    await page.reload();
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toBeVisible();
    await saveScreenshot(page, testInfo, PHASE, 'projects-cards-dark');
    expect(await axeBlocking(page)).toEqual([]);
  });

  test('table view is remembered and uses server pagination', async ({ page }, testInfo) => {
    await setup(page, { many: true });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Table view' }).click();
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Project 01 Harbour Bridge Refurbishment' })).toBeVisible();
    await noHorizontalScroll(page);
    await saveScreenshot(page, testInfo, PHASE, 'projects-table-light');

    const next = page.waitForRequest((r) => r.method() === 'GET' && /\/projects\?/.test(r.url()) && new URL(r.url()).searchParams.get('skip') === '10');
    await page.getByRole('button', { name: /next page/i }).click();
    await next;
    await expect(page.getByRole('link', { name: /Project 11/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem('icepac.projectsView'))).toBe('table');
    expect(await axeBlocking(page)).toEqual([]);
  });

  test('table view in dark mode', async ({ page }, testInfo) => {
    await setup(page, { scheme: 'dark', view: 'table' });
    await page.goto('/projects');
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Data Centre Fit-out' })).toBeVisible();
    await saveScreenshot(page, testInfo, PHASE, 'projects-table-dark');
    expect(await axeBlocking(page)).toEqual([]);
  });

  test('card grid paginates', async ({ page }) => {
    await setup(page, { many: true });
    await page.goto('/projects');
    const next = page.waitForRequest((r) => r.method() === 'GET' && new URL(r.url()).searchParams.get('skip') === '12');
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await next;
    await expect(page.getByRole('link', { name: /Project 13/ })).toBeVisible();
  });

  test('search sends the search parameter', async ({ page }) => {
    await setup(page);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: 'Data Centre Fit-out' })).toBeVisible();
    const req = page.waitForRequest((r) => r.method() === 'GET' && new URL(r.url()).searchParams.get('search') === 'data');
    await page.getByRole('searchbox', { name: 'Search projects' }).fill('data');
    await req;
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Data Centre Fit-out' })).toBeVisible();
  });

  test('empty list shows the empty state with a create action', async ({ page }, testInfo) => {
    await setup(page);
    await page.route(/\/api\/v1\/projects(\?.*)?$/, (route) =>
      route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, skip: 0, limit: 12 }) }),
    );
    await page.goto('/projects');
    await expect(page.getByText('No projects yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(2);
    await saveScreenshot(page, testInfo, PHASE, 'projects-empty-light');
  });

  test('a 500 shows the error state, an error toast and retry works', async ({ page }, testInfo) => {
    await setup(page);
    let fail = true;
    await page.route(/\/api\/v1\/projects(\?.*)?$/, (route) => {
      if (!fail) return route.fallback();
      return route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal error' }) });
    });
    await page.goto('/projects');
    await expect(page.getByText('Could not load projects')).toBeVisible();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await saveScreenshot(page, testInfo, PHASE, 'projects-error-light');
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toBeVisible();
  });

  test('create issues POST /projects and toasts', async ({ page }, testInfo) => {
    await setup(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await dialog.getByLabel('Project name').fill('Tunnel Upgrade');
    await dialog.getByLabel('Project manager').fill('Alex Kim');
    await saveScreenshot(page, testInfo, PHASE, 'projects-create-dialog-light');
    const req = page.waitForRequest((r) => r.method() === 'POST' && /\/api\/v1\/projects$/.test(r.url()));
    await dialog.getByRole('button', { name: 'Create project' }).click();
    expect((await req).postDataJSON()).toEqual({ project_name: 'Tunnel Upgrade', project_manager: 'Alex Kim' });
    await expect(page.getByText('Project created')).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test('?new=1 opens the create dialog and is removed when it closes', async ({ page }) => {
    await setup(page);
    await page.goto('/projects?new=1');
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('create requires a name', async ({ page }) => {
    await setup(page);
    await page.goto('/projects?new=1');
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByText('Project name is required')).toBeVisible();
  });

  test('edit issues PUT /projects/1 and toasts', async ({ page }) => {
    await setup(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Edit Harbour Bridge Refurbishment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit project' });
    await expect(dialog.getByLabel('Project name')).toHaveValue('Harbour Bridge Refurbishment');
    await dialog.getByLabel('Project manager').fill('');
    const req = page.waitForRequest((r) => r.method() === 'PUT' && /\/api\/v1\/projects\/1$/.test(r.url()));
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    expect((await req).postDataJSON()).toEqual({
      project_name: 'Harbour Bridge Refurbishment',
      project_manager: null,
      description: 'Structural refurbishment and repainting programme.',
    });
    await expect(page.getByText('Project updated')).toBeVisible();
  });

  test('archive confirms, issues DELETE /projects/1 and toasts', async ({ page }, testInfo) => {
    await setup(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Archive Harbour Bridge Refurbishment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Archive project?' });
    await expect(dialog).toContainText('Nothing is deleted');
    await saveScreenshot(page, testInfo, PHASE, 'projects-archive-dialog-light');
    const req = page.waitForRequest((r) => r.method() === 'DELETE' && /\/api\/v1\/projects\/1$/.test(r.url()));
    await dialog.getByRole('button', { name: 'Archive project' }).click();
    await req;
    await expect(page.getByText('Project archived')).toBeVisible();
  });

  test('clicking a card opens the project', async ({ page }) => {
    await setup(page);
    await page.goto('/projects');
    await page.getByRole('link', { name: 'Harbour Bridge Refurbishment' }).click();
    await expect(page).toHaveURL(/\/projects\/1$/);
  });
});

const listParams = (r: { url(): string }) => new URL(r.url()).searchParams;
const isList = (r: { method(): string; url(): string }) => r.method() === 'GET' && /\/api\/v1\/projects\?/.test(r.url());

test.describe('archived projects', () => {
  test('the Archived toggle lists archived projects, marks them and keeps ?archived=1', async ({ page }, testInfo) => {
    await setup(page);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toBeVisible();
    const req = page.waitForRequest((r) => isList(r) && listParams(r).get('archived') === 'true');
    await page.getByRole('button', { name: 'Archived', exact: true }).click();
    await req;
    await expect(page).toHaveURL(/archived=1/);
    await expect(page.getByRole('link', { name: 'Old Wharf Dredging' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toHaveCount(0);
    await expect(page.getByText('2 archived projects')).toBeVisible();
    await expect(page.getByText('Archived', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Archive / })).toHaveCount(0);
    await noHorizontalScroll(page);
    await saveScreenshot(page, testInfo, 'closeout', 'projects-archived-light');
    expect(await axeBlocking(page)).toEqual([]);

    await page.reload();
    await expect(page.getByRole('link', { name: 'Old Wharf Dredging' })).toBeVisible();
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Harbour Bridge Refurbishment' })).toBeVisible();
    await expect(page).not.toHaveURL(/archived/);
  });

  test('archived table view and dark mode', async ({ page }, testInfo) => {
    await setup(page, { scheme: 'dark', view: 'table' });
    await page.goto('/projects?archived=1');
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Legacy Billing Migration' })).toBeVisible();
    await saveScreenshot(page, testInfo, 'closeout', 'projects-archived-table-dark');
    expect(await axeBlocking(page)).toEqual([]);
  });

  test('restore confirms, issues POST /projects/3/restore, toasts and updates the list', async ({ page }, testInfo) => {
    await setup(page);
    await page.goto('/projects?archived=1');
    await page.getByRole('button', { name: 'Restore Old Wharf Dredging' }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore project?' });
    await saveScreenshot(page, testInfo, 'closeout', 'projects-restore-dialog-light');
    const req = page.waitForRequest((r) => r.method() === 'POST' && /\/api\/v1\/projects\/3\/restore$/.test(r.url()));
    await dialog.getByRole('button', { name: 'Restore project' }).click();
    await req;
    await expect(page.getByText('Project restored')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Old Wharf Dredging' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Legacy Billing Migration' })).toBeVisible();
  });

  test('archive text points to the Archived view', async ({ page }) => {
    await setup(page);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Archive Harbour Bridge Refurbishment' }).click();
    await expect(page.getByRole('dialog', { name: 'Archive project?' })).toContainText('restore it later from the Archived view');
  });

  test('viewers see no Restore action', async ({ page }) => {
    api = await mockApi(page);
    await loginAs(page, 'viewer');
    await page.goto('/projects?archived=1');
    await expect(page.getByRole('link', { name: 'Old Wharf Dredging' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Restore / })).toHaveCount(0);
  });
});

test.describe('projects sorting and status filter', () => {
  test('the card Sort by select sends sort and order and returns to page 1', async ({ page }, testInfo) => {
    await setup(page, { many: true });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(page.getByRole('link', { name: /Project 13/ })).toBeVisible();
    const req = page.waitForRequest((r) => isList(r) && listParams(r).get('sort') === 'name' && listParams(r).get('order') === 'desc');
    await page.getByRole('combobox', { name: 'Sort by' }).click();
    await page.getByRole('option', { name: 'Name Z to A' }).click();
    const sent = listParams(await req);
    expect(sent.get('skip')).toBe('0');
    await expect(page).toHaveURL(/sort=name&order=desc/);
    await expect(page.getByRole('link', { name: /Project 15/ })).toBeVisible();
    await saveScreenshot(page, testInfo, 'closeout', 'projects-sorted-cards-light');
  });

  test('table headers sort on the server and the sort survives a reload', async ({ page }, testInfo) => {
    await setup(page, { many: true, view: 'table' });
    await page.goto('/projects');
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();
    const asc = page.waitForRequest((r) => isList(r) && listParams(r).get('sort') === 'name' && listParams(r).get('order') === 'asc');
    await page.getByRole('columnheader', { name: /^Project/ }).click();
    await asc;
    const desc = page.waitForRequest((r) => isList(r) && listParams(r).get('sort') === 'name' && listParams(r).get('order') === 'desc');
    await page.getByRole('columnheader', { name: /^Project/ }).click();
    await desc;
    await saveScreenshot(page, testInfo, 'closeout', 'projects-sorted-table-light');
    await page.reload();
    await expect(page.getByRole('columnheader', { name: /^Project/ })).toHaveAttribute('aria-sort', 'descending');
  });

  test('the status filter sends status, resets paging and is kept in the URL', async ({ page }, testInfo) => {
    await setup(page, { many: true });
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(page.getByRole('link', { name: /Project 13/ })).toBeVisible();
    const req = page.waitForRequest((r) => isList(r) && listParams(r).get('status') === 'imported');
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Imported' }).click();
    expect(listParams(await req).get('skip')).toBe('0');
    await expect(page).toHaveURL(/status=imported/);
    await saveScreenshot(page, testInfo, 'closeout', 'projects-status-filter-light');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Status' })).toContainText('Imported');
  });

  test('a filter with no matches shows the filtered empty state', async ({ page }) => {
    await setup(page);
    await page.goto('/projects?status=import_failed');
    await expect(page.getByText('No projects match your filters')).toBeVisible();
  });
});

test.describe('project import (ProjectUpload on the project page)', () => {
  async function openImport(page: Page) {
    await page.goto('/projects/1?tab=imports');
    await expect(page.getByRole('button', { name: 'Choose file' })).toBeVisible();
  }

  test('shows accepted types, history, and is accessible in light and dark', async ({ page }, testInfo) => {
    await setup(page);
    await openImport(page);
    await expect(page.getByText(/Accepted types: \.mpp, \.mpx, \.xml/)).toBeVisible();
    await expect(page.getByRole('gridcell', { name: 'harbour-bridge.mpp' })).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Could not parse file')).toBeVisible();
    await noHorizontalScroll(page);
    await saveScreenshot(page, testInfo, PHASE, 'project-import-light');
    expect(await axeBlocking(page)).toEqual([]);

    await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Choose file' })).toBeVisible();
    await saveScreenshot(page, testInfo, PHASE, 'project-import-dark');
    expect(await axeBlocking(page)).toEqual([]);
  });

  test('rejects an invalid file type without calling the API', async ({ page }) => {
    await setup(page);
    await openImport(page);
    await page.getByTestId('upload-input').setInputFiles({ name: 'sheet.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.alloc(500) });
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid file type ".xlsx"' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start import' })).toHaveCount(0);
  });

  test('uploads a file, polls the job to completion and shows the summary', async ({ page }, testInfo) => {
    await setup(page);
    const polls: string[] = [];
    page.on('request', (r) => {
      if (/\/api\/v1\/projects\/1\/imports\/7$/.test(r.url())) polls.push(r.url());
    });
    await openImport(page);
    await page.getByTestId('upload-input').setInputFiles({ name: 'plan.mpp', mimeType: 'application/octet-stream', buffer: Buffer.alloc(2048) });
    await expect(page.getByText('plan.mpp')).toBeVisible();
    const req = page.waitForRequest((r) => r.method() === 'POST' && /\/api\/v1\/projects\/1\/import$/.test(r.url()));
    await page.getByRole('button', { name: 'Start import' }).click();
    const sent = await req;
    expect(sent.headers()['content-type']).toContain('multipart/form-data');
    expect(sent.postData()).toContain('filename="plan.mpp"');
    await expect(page.getByText(/Import completed: 12 tasks, 3 resources, 20 assignments/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Import completed', { exact: true })).toBeVisible();
    await expect.poll(() => polls.length).toBeGreaterThanOrEqual(2);
    await saveScreenshot(page, testInfo, PHASE, 'project-import-done-light');
  });

  test('drag-over highlights the drop zone', async ({ page }) => {
    await setup(page);
    await openImport(page);
    const zone = page.getByTestId('upload-dropzone');
    await zone.dispatchEvent('dragover');
    await expect(zone).toHaveAttribute('data-dragging', 'true');
    await expect(page.getByText('Drop the file to select it')).toBeVisible();
  });
});

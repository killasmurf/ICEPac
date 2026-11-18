/**
 * Real-API smoke suite: drives the built UI against a live FastAPI server seeded by
 * scripts/seed_smoke.py. No mocks. Run order matters (read-only flows first, then mutations),
 * and the database must be freshly seeded (`--reset`) before every run.
 *
 * Tests marked test.fail() document known product bugs; see docs/REAL_API_SMOKE.md (finding IDs).
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ------------------------------------------------------------------ seed constants
const SEED = JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'scripts', 'seed_smoke_data.json'), 'utf8'));
const API = process.env.SMOKE_API_URL ?? 'http://localhost:8010/api/v1';
const OUT = path.resolve(process.cwd(), 'e2e-real', '__screenshots__');
mkdirSync(OUT, { recursive: true });

interface SeedAssignment { resource: string; best: number; likely: number; worst: number }
interface SeedWbs { code: string; title: string; assignments?: SeedAssignment[]; children?: SeedWbs[]; risks?: unknown[] }
interface SeedProject { key: string; name: string; wbs: SeedWbs[]; project_risks: unknown[] }

const pert = (a: SeedAssignment) => (a.best + 4 * a.likely + a.worst) / 6;
const flatten = (nodes: SeedWbs[]): SeedWbs[] => nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
const projectOf = (key: string): SeedProject => SEED.projects.find((p: SeedProject) => p.key === key);
const projectPert = (p: SeedProject) =>
  flatten(p.wbs).reduce((s, w) => s + (w.assignments ?? []).reduce((t, a) => t + pert(a), 0), 0);
const TOTAL_PERT: number = SEED.projects.reduce((s: number, p: SeedProject) => s + projectPert(p), 0);
const TOTAL_ASSIGNMENTS: number = SEED.projects.reduce(
  (s: number, p: SeedProject) => s + flatten(p.wbs).reduce((t, w) => t + (w.assignments ?? []).length, 0),
  0,
);
const WBS_COUNT = (p: SeedProject) => flatten(p.wbs).length;
const user = (role: string) => SEED.users.find((u: { role: string }) => u.role === role);
const NEW_USER_PASSWORD = 'SmokeUser#2027-reset';

// Same formatting as frontend/src/utils/format.ts (VITE_LOCALE en-AU, VITE_CURRENCY AUD defaults).
const money = (v: number, o: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', ...o }).format(v);
const compact = (v: number) => money(v, { notation: 'compact', maximumFractionDigits: 1 });
const whole = (v: number) => money(v, { maximumFractionDigits: 0 });

// ------------------------------------------------------------------ diagnostics
// Playwright restarts the worker after a failing test, so in-memory state is lost: persist on disk.
interface Diag { test: string; kind: 'console' | 'pageerror' | 'http'; page: string; detail: string }
const DIAG_FILE = path.join(OUT, 'diagnostics.jsonl');
const FINDINGS_FILE = path.join(OUT, 'findings-data.json');
const addDiag = (d: Diag) => appendFileSync(DIAG_FILE, JSON.stringify(d) + '\n');
const readDiags = (): Diag[] =>
  existsSync(DIAG_FILE) ? readFileSync(DIAG_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
/** Assigning findings.x = v merges it into findings-data.json. */
const findings: Record<string, unknown> = new Proxy({}, {
  set(_t, key, value) {
    const cur = existsSync(FINDINGS_FILE) ? JSON.parse(readFileSync(FINDINGS_FILE, 'utf8')) : {};
    cur[String(key)] = value;
    writeFileSync(FINDINGS_FILE, JSON.stringify(cur, null, 2));
    return true;
  },
});

const test = base.extend<{ _diag: void }>({
  _diag: [
    async ({ page }, use, testInfo) => {
      const add = (kind: Diag['kind'], detail: string) =>
        addDiag({ test: testInfo.title, kind, page: page.url().replace(/^https?:\/\/[^/]+/, ''), detail });
      page.on('console', (m) => {
        if (m.type() === 'error') add('console', m.text());
      });
      page.on('pageerror', (e) => add('pageerror', String(e)));
      page.on('response', (r) => {
        if (r.status() >= 400) add('http', `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
      });
      await use();
    },
    { auto: true },
  ],
});

/** Marks the current test as a documented product bug. Set SMOKE_FIXED=1 to run these tests as plain assertions (e.g. to verify a fix). */
const knownBug = (why: string) => test.fail(!process.env.SMOKE_FIXED, why);

// ------------------------------------------------------------------ helpers
async function login(page: Page, role: 'admin' | 'manager' | 'user', password?: string) {
  const u = user(role);
  await page.goto('/login');
  await page.getByLabel('Username').fill(u.username);
  await page.getByLabel('Password', { exact: true }).fill(password ?? u.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function apiToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(token, 'access_token in localStorage').toBeTruthy();
  return token as string;
}

async function projectId(page: Page, name: string): Promise<number> {
  const res = await page.request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${await apiToken(page)}` } });
  const body = await res.json();
  const p = body.items.find((i: { project_name: string }) => i.project_name === name);
  expect(p, `project ${name} via API`).toBeTruthy();
  return p.id;
}

async function projectEstimation(page: Page, id: number) {
  const res = await page.request.get(`${API}/projects/${id}/estimation`, {
    headers: { Authorization: `Bearer ${await apiToken(page)}` },
  });
  return res.json();
}

async function openProject(page: Page, id: number, query = '') {
  await page.goto(`/projects/${id}${query}`);
  await expect(page.getByRole('region', { name: 'Project summary' })).toBeVisible();
}

const band = (page: Page) => page.getByRole('region', { name: 'Project summary' });
const stat = (scope: Locator, label: string) =>
  scope.locator('.MuiCard-root', { has: scope.page().getByText(label, { exact: true }) }).locator('.MuiTypography-h4');

async function expandAll(page: Page) {
  const tree = page.getByRole('tree', { name: 'Work breakdown structure' });
  await expect(tree.getByRole('treeitem').first()).toBeVisible();
  for (let i = 0; i < 20; i++) {
    const collapsed = tree.locator('[role="treeitem"][aria-expanded="false"]');
    if ((await collapsed.count()) === 0) break;
    await collapsed.first().locator('span[aria-hidden="true"]').first().click();
  }
}

const treeItem = (page: Page, code: string) =>
  page.getByRole('tree', { name: 'Work breakdown structure' }).getByRole('treeitem').filter({ hasText: new RegExp(`^${code.replace('.', '\\.')}`) });

async function selectWbs(page: Page, code: string, title: string) {
  await expandAll(page);
  await treeItem(page, code).filter({ hasText: title }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
}

async function pickOption(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}


/**
 * WORKAROUND for finding F-01 (blocker): GET and POST /projects/{id}/wbs/{id}/approval always return 500
 * (WBSApprovalResponse.model_validate(WBS) lacks wbs_id), which makes the whole WBS detail panel show
 * "Could not load WBS details". To keep exercising everything behind it against the real backend, flows that
 * need the panel call shimApproval(): it answers ONLY that endpoint from the real WBS list API. For POST it still
 * lets the real request run first (the state change is committed server-side before the 500), then reports 200.
 */
async function shimApproval(page: Page, pid: number) {
  await page.route(/\/projects\/\d+\/wbs\/\d+\/approval$/, async (route) => {
    const url = route.request().url();
    const wbsId = Number(/wbs\/(\d+)\/approval/.exec(url)?.[1]);
    if (route.request().method() === 'POST') await route.fetch();
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    const list = await (await page.request.get(`${API}/projects/${pid}/wbs?limit=1000`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const w = list.items.find((i: { id: number }) => i.id === wbsId);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        wbs_id: w.id,
        approval_status: w.approval_status,
        approver: w.approver,
        approver_date: w.approver_date,
        estimate_revision: w.estimate_revision,
      }),
    });
  });
}

// ================================================================== 0. login page
test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
  await shot(page, '00-login');
});

test('login with a wrong password shows an error and stays on /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(user('admin').username);
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('alert')).toBeVisible();
});

// ================================================================== 1. dashboard
test('admin: dashboard figures match the seed, charts and health panel render', async ({ page }) => {
  await login(page, 'admin');
  const nProjects = SEED.projects.length;
  // Total estimate = sum of seeded PERT values (compact currency, as the card formats it).
  await expect(page.getByText('Total estimate', { exact: true })).toBeVisible();
  await expect(page.getByText(compact(TOTAL_PERT)).first()).toBeVisible();
  await expect(page.getByText(`across ${TOTAL_ASSIGNMENTS} assignments`)).toBeVisible();
  await expect(page.getByText(`of ${nProjects} projects`)).toBeVisible();
  // Estimate-by-project chart and approval chart
  const chart = page.getByRole('region', { name: 'Estimate by project' });
  await expect(chart).toBeVisible();
  await expect(chart.locator('svg').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Approval status' }).locator('svg').first()).toBeVisible();
  // System health panel renders with a status badge
  const health = page.getByRole('region', { name: 'System health' });
  await expect(health).toBeVisible();
  await expect(health).toContainText(/database/i);
  await page.waitForTimeout(500);
  await shot(page, '01-dashboard-admin');
});

// Finding F-08: /dashboard/health-detailed runs db.execute("SELECT 1") (not text()), so the DB probe always fails.
test('admin: dashboard system health reports the database as healthy', async ({ page }) => {
  knownBug('F-08: health probe uses a raw SQL string; SQLAlchemy 2 raises ArgumentError so database is always unhealthy');
  await login(page, 'admin');
  const health = page.getByRole('region', { name: 'System health' });
  await expect(health).toBeVisible();
  const res = await page.request.get(`${API}/dashboard/health-detailed`, { headers: { Authorization: `Bearer ${await apiToken(page)}` } });
  const body = await res.json();
  expect(body.database.status).toBe('healthy');
  expect(body.overall).not.toBe('degraded');
});

// Finding F-09: recent_activity.username is always "" because AuditLog has no `username` attribute.
test('admin: dashboard recent activity names the acting user', async ({ page }) => {
  knownBug('F-09: /dashboard/stats recent_activity[].username is always an empty string');
  await login(page, 'admin');
  const res = await page.request.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${await apiToken(page)}` } });
  const body = await res.json();
  const withUser = body.recent_activity.filter((a: { username: string }) => a.username);
  expect(withUser.length).toBe(body.recent_activity.filter((a: { entity_type: string }) => a.entity_type).length - 1 /* one FAILED_LOGIN has no user */);
});

// ================================================================== 2. projects + WBS
test('projects list shows the seeded projects', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/projects');
  for (const p of SEED.projects) await expect(page.getByText(p.name, { exact: true }).first()).toBeVisible();
  await shot(page, '02-projects-list');
});

test('project: WBS tree shows the seeded 3-level hierarchy and the detail panel lists assignments with PERT values', async ({ page }) => {
  await login(page, 'admin');
  const harbour = projectOf('harbour');
  await shimApproval(page, await projectId(page, harbour.name)); // F-01 workaround
  await page.goto('/projects');
  await page.getByText(harbour.name, { exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects\/\d+/);
  await expect(page.getByRole('heading', { level: 1, name: harbour.name })).toBeVisible();
  await expandAll(page);
  const tree = page.getByRole('tree', { name: 'Work breakdown structure' });
  await expect(tree.getByRole('treeitem')).toHaveCount(WBS_COUNT(harbour));
  for (const w of flatten(harbour.wbs)) await expect(treeItem(page, w.code).filter({ hasText: w.title }).first()).toBeVisible();
  // aria-level reflects the 3-level hierarchy
  await expect(treeItem(page, '1.1.1').first()).toHaveAttribute('aria-level', '3');
  await shot(page, '03-project-wbs-tree');

  // Select 1.1.1 Geotechnical Survey: two seeded assignments
  const geo = flatten(harbour.wbs).find((w) => w.code === '1.1.1') as SeedWbs;
  await expandAll(page); // the full-page screenshot above can leave the tree collapsed again (observed once)
  await treeItem(page, '1.1.1').first().click();
  await expect(page.getByRole('heading', { level: 2, name: geo.title })).toBeVisible();
  const table = page.getByRole('grid', { name: 'Resource assignments' });
  await expect(table).toBeVisible();
  for (const a of geo.assignments as SeedAssignment[]) {
    const row = table.getByRole('row').filter({ hasText: a.resource });
    await expect(row).toBeVisible();
    await expect(row).toContainText(money(pert(a)));
    await expect(row).toContainText(money(a.best));
    await expect(row).toContainText(money(a.worst));
  }
  const totals = page.getByRole('group', { name: 'Assignment totals' });
  await expect(totals).toContainText(money((geo.assignments as SeedAssignment[]).reduce((s, a) => s + pert(a), 0)));
  await shot(page, '04-wbs-detail-assignments');
});

// Finding F-14: API serialises Decimal as strings ("12000.00"); the totals strip adds them as numbers and shows $NaN.
test('WBS detail: assignment totals strip shows Best/Likely/Worst sums', async ({ page }) => {
  knownBug('F-14: AssignmentList totals sum string decimals from the API, so Best/Likely/Worst render as $NaN');
  await login(page, 'admin');
  const harbour = projectOf('harbour');
  const id = await projectId(page, harbour.name);
  await shimApproval(page, id); // F-01 workaround
  await openProject(page, id);
  await selectWbs(page, '1.1.1', 'Geotechnical Survey');
  const geo = flatten(harbour.wbs).find((w) => w.code === '1.1.1') as SeedWbs;
  const totals = page.getByRole('group', { name: 'Assignment totals' });
  await expect(totals).toBeVisible();
  await expect(totals).not.toContainText('NaN');
  await expect(totals).toContainText(money((geo.assignments as SeedAssignment[]).reduce((t, a) => t + a.best, 0)));
});

// Finding F-01 (blocker): GET /projects/{id}/wbs/{id}/approval 500s for every WBS item.
test('project: selecting a WBS item loads its detail panel (no workaround)', async ({ page }) => {
  knownBug('F-01: GET /projects/{id}/wbs/{id}/approval returns 500 (WBSApprovalResponse needs wbs_id); the panel shows "Could not load WBS details"');
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  await openProject(page, id);
  await expandAll(page);
  await treeItem(page, '1.1.1').first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Geotechnical Survey' })).toBeVisible();
  await expect(page.getByRole('grid', { name: 'Resource assignments' })).toBeVisible();
  await shot(page, '04b-wbs-detail-broken');
});

test('project: Summary tab renders the estimation breakdowns', async ({ page }) => {
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  await openProject(page, id, '?tab=summary');
  await expect(band(page)).toContainText(whole(projectPert(projectOf('harbour'))));
  await page.waitForTimeout(800);
  await shot(page, '05-project-summary-tab');
});

test('project with null manager, null description and zero-value assignments renders (layout edge case)', async ({ page }) => {
  await login(page, 'admin');
  const p = projectOf('legacy');
  const id = await projectId(page, p.name);
  await openProject(page, id);
  await expect(band(page)).toContainText('No project manager assigned');
  await expandAll(page);
  await expect(page.getByRole('tree', { name: 'Work breakdown structure' }).getByRole('treeitem')).toHaveCount(WBS_COUNT(p));
  await treeItem(page, '1.1.1').first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Source system inventory' })).toBeVisible();
  await shot(page, '06-project-legacy-edge-case');
});

// ================================================================== 3. reports (read-only, before mutations)
// Finding F-03: every report that touches WBS.title 500s (cost_by_wbs, boe_*, risk_*, project_summary).
test('reports: Cost by WBS preview total equals the seeded total; CSV and XLSX export', async ({ page }) => {
  knownBug('F-03: POST /reports/generate for cost_by_wbs returns 500 (AttributeError: WBS has no attribute title)');
  const harbour = projectOf('harbour');
  await login(page, 'admin');
  await page.goto('/reports');
  await page.getByRole('radio', { name: /Cost by WBS/ }).click();
  await pickOption(page, 'Project', harbour.name);
  await page.getByRole('button', { name: 'Generate' }).click();
  const totals = page.getByLabel('Report totals');
  await expect(totals).toBeVisible();
  await expect(totals).toContainText(new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Math.round(projectPert(harbour))));
});

test('reports: Cost by Resource preview total equals the seeded total; CSV and XLSX downloads come from Content-Disposition', async ({ page }) => {
  const harbour = projectOf('harbour');
  await login(page, 'admin');
  await page.goto('/reports');
  await page.getByRole('radio', { name: /Cost by Resource/ }).click();
  await pickOption(page, 'Project', harbour.name);
  await page.getByRole('button', { name: 'Generate' }).click();
  const totals = page.getByLabel('Report totals');
  await expect(totals).toBeVisible();
  const expectedWhole = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Math.round(projectPert(harbour)));
  await expect(totals).toContainText(expectedWhole);
  await page.waitForTimeout(500);
  await shot(page, '07-reports-cost-by-resource');

  const names: Record<string, string> = {};
  for (const fmt of ['CSV', 'XLSX'] as const) {
    const respPromise = page.waitForResponse((r) => r.url().includes('/reports/export'));
    const dlPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Choose export format' }).click();
    await page.getByRole('menuitem', { name: new RegExp(`^${fmt}`) }).click();
    const [resp, dl] = await Promise.all([respPromise, dlPromise]);
    expect(resp.status()).toBe(200);
    const cd = resp.headers()['content-disposition'] ?? '';
    const serverName = /filename="?([^";]+)"?/.exec(cd)?.[1];
    expect(serverName, `Content-Disposition (${cd})`).toBeTruthy();
    expect(dl.suggestedFilename()).toBe(serverName);
    expect(dl.suggestedFilename()).toMatch(new RegExp(`^cost_by_resource_\\d{8}_\\d{6}\\.${fmt.toLowerCase()}$`));
    mkdirSync(path.join(OUT, '..', '__downloads__'), { recursive: true });
    const saved = path.join(OUT, '..', '__downloads__', dl.suggestedFilename());
    await dl.saveAs(saved);
    expect(statSync(saved).size).toBeGreaterThan(100);
    names[fmt] = dl.suggestedFilename();
    await expect(page.getByRole('button', { name: 'Choose export format' })).toBeEnabled();
  }
  findings.exportFilenames = names;
});

test('reports: other report types load (smoke of every catalog entry via the API)', async ({ page }) => {
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  const headers = { Authorization: `Bearer ${await apiToken(page)}` };
  const catalog = await (await page.request.get(`${API}/reports/catalog`, { headers })).json();
  const types: string[] = Object.values(catalog).flatMap((c) => (c as { reports: { type: string }[] }).reports.map((r) => r.type));
  const status: Record<string, number> = {};
  for (const t of types) {
    const r = await page.request.post(`${API}/reports/generate`, { headers, data: { report_type: t, filters: { project_id: id } } });
    status[t] = r.status();
  }
  findings.reportStatus = status;
  // Known-bad types are documented in F-03; assert the remaining ones work.
  const bad = Object.entries(status).filter(([, s]) => s >= 500).map(([t]) => t).sort();
  expect(bad).toEqual(['boe_by_wbs', 'boe_detailed', 'boe_summary', 'cost_by_wbs', 'project_summary', 'risk_assessment', 'risk_summary']);
});

// ================================================================== 4. mutations
test('create an assignment through the form; header totals update to the new sum', async ({ page }) => {
  await login(page, 'admin');
  const harbour = projectOf('harbour');
  const id = await projectId(page, harbour.name);
  const before = (await projectEstimation(page, id)).total_pert_estimate as number;
  expect(before).toBeCloseTo(projectPert(harbour), 2);
  await shimApproval(page, id); // F-01 workaround
  await openProject(page, id);
  await expect(band(page)).toContainText(whole(before));
  await selectWbs(page, '1.2.1', 'Structural Design');

  const added: SeedAssignment = { resource: 'ENG-JR', best: 1000, likely: 2000, worst: 4000 };
  await page.getByRole('button', { name: 'Add Assignment' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New Assignment' });
  await expect(dialog).toBeVisible();
  await pickOption(page, 'Resource', /^ENG-JR/);
  await dialog.getByLabel('Best Estimate').fill(String(added.best));
  await dialog.getByLabel('Likely Estimate').fill(String(added.likely));
  await dialog.getByLabel('Worst Estimate').fill(String(added.worst));
  await expect(dialog.getByTestId('pert-preview')).toContainText(money(pert(added)));
  await shot(page, '08-assignment-form');
  const posted = page.waitForResponse((r) => r.url().includes('/assignments') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Create' }).click();
  const resp = await posted;
  expect(resp.status()).toBe(201);
  const body = await resp.json();
  expect(body.pert_estimate).toBeCloseTo(pert(added), 2);

  const after = before + pert(added);
  await expect(band(page)).toContainText(whole(after));
  const apiAfter = (await projectEstimation(page, id)).total_pert_estimate as number;
  expect(apiAfter).toBeCloseTo(after, 2);
  const row = page.getByRole('grid', { name: 'Resource assignments' }).getByRole('row').filter({ hasText: 'ENG-JR' });
  await expect(row).toContainText(money(pert(added)));
  await shot(page, '09-after-assignment-created');
});

test('submit a WBS item for approval, then approve it; the status chip changes', async ({ page }) => {
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  await shimApproval(page, id); // F-01 workaround
  await openProject(page, id);
  await selectWbs(page, '1.2.2', 'Utilities Relocation Design');
  const header = page.locator('h2', { hasText: 'Utilities Relocation Design' }).locator('..');
  await expect(header).toContainText('Draft');
  await page.getByRole('tab', { name: 'Approval' }).click();
  await page.getByRole('button', { name: 'Submit for Approval' }).click();
  await expect(header).toContainText('Submitted');
  await expect(treeItem(page, '1.2.2').first()).toContainText('Submitted');
  await shot(page, '10-wbs-submitted');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(header).toContainText('Approved');
  await expect(treeItem(page, '1.2.2').first()).toContainText('Approved');
  await expect(page.getByText(/This estimate has been approved and is locked/)).toBeVisible();
  await shot(page, '11-wbs-approved');
});

// Finding F-02 (blocker): POST /projects/{id}/risks returns 500 ('risk_exposure' is an invalid keyword argument for Risk).
test('add a project-level risk; the Risks card count increases by one', async ({ page }) => {
  knownBug("F-02: POST /projects/{id}/risks returns 500 (RiskBase.risk_exposure is passed to the Risk ORM constructor); the browser then reports it as a CORS error (F-10)");
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  const beforeCount = (await projectEstimation(page, id)).total_risks as number;
  await openProject(page, id);
  await expect(stat(band(page), 'Risks')).toHaveText(String(beforeCount));
  await page.getByRole('tab', { name: 'Risks' }).click();
  await page.getByRole('button', { name: 'Add Project Risk' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Project Risk' });
  await dialog.getByLabel('Title').fill('Smoke test risk: contractor insolvency');
  await pickOption(page, 'Category', /^COMM/);
  await dialog.getByLabel('Risk Cost').fill('25000');
  await pickOption(page, 'Probability', /LOW|Low/);
  await pickOption(page, 'Severity', /MOD|Moderate/);
  await shot(page, '12a-project-risk-form');
  await dialog.getByRole('button', { name: 'Create Risk' }).click();
  await expect(page.getByText('Smoke test risk: contractor insolvency')).toBeVisible();
  await expect(stat(band(page), 'Risks')).toHaveText(String(beforeCount + 1));
  await shot(page, '12-project-risks-tab');
});

test('project Risks tab lists the seeded project-level risks and the header card agrees', async ({ page }) => {
  await login(page, 'admin');
  const harbour = projectOf('harbour');
  const id = await projectId(page, harbour.name);
  await openProject(page, id, '?tab=risks');
  for (const r of harbour.project_risks as { title: string }[]) await expect(page.getByText(r.title, { exact: true })).toBeVisible();
  await expect(stat(band(page), 'Risks')).toHaveText(String(harbour.project_risks.length));
  await page.waitForTimeout(500);
  await shot(page, '12b-project-risks-seeded');
});

// Finding F-04: estimation endpoint counts only project-level risks; WBS-level risks are dropped.
test('project header Risks card counts WBS-level plus project-level risks (matches the dashboard portfolio)', async ({ page }) => {
  knownBug('F-04: GET /projects/{id}/estimation uses RiskRepository.get_by_project (project-level only), so WBS-level risks are missing from total_risks/exposure/per-WBS risk_count');
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  const token = await apiToken(page);
  const portfolio = await (await page.request.get(`${API}/dashboard/portfolio`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const portfolioCount = portfolio.projects.find((p: { project_id: number }) => p.project_id === id).risk_count;
  await openProject(page, id);
  await expect(stat(band(page), 'Risks')).toHaveText(String(portfolioCount));
});

// Findings F-05 and F-02: the WBS-scoped risk form posts no `title` (422), and with a title the server 500s.
test('WBS detail: add a WBS-level risk through the form', async ({ page }) => {
  knownBug('F-05: frontend RiskCreate omits required `title` -> 422; F-02: with a title the endpoint 500s anyway');
  await login(page, 'admin');
  const id = await projectId(page, projectOf('harbour').name);
  await shimApproval(page, id); // F-01 workaround
  await openProject(page, id);
  await selectWbs(page, '1.2.1', 'Structural Design');
  await page.getByRole('tablist', { name: 'WBS details' }).getByRole('tab', { name: 'Risks' }).click();
  await page.getByRole('button', { name: 'Add Risk' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New Risk' });
  await pickOption(page, 'Risk Category', /^TECH/);
  await dialog.getByLabel('Risk Cost').fill('5000');
  await shot(page, '12c-wbs-risk-form');
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Risk created')).toBeVisible();
});

// Not assertions: raw API evidence for docs/REAL_API_SMOKE.md (written to findings-data.json).
test('record raw API evidence for the findings', async ({ page }) => {
  await login(page, 'admin');
  const token = await apiToken(page);
  const headers = { Authorization: `Bearer ${token}` };
  const id = await projectId(page, projectOf('harbour').name);
  const probe = async (method: 'get' | 'post', url: string, data?: unknown) => {
    const r = await page.request[method](`${API}${url}`, { headers, data });
    const text = await r.text();
    return { status: r.status(), body: text.slice(0, 300) };
  };
  findings.probes = {
    approvalGet: await probe('get', `/projects/${id}/wbs/3/approval`),
    projectRiskCreate: await probe('post', `/projects/${id}/risks`, { title: 'probe', risk_cost: 10 }),
    wbsRiskCreateWithTitle: await probe('post', `/projects/${id}/wbs/5/risks`, { title: 'probe', risk_cost: 10 }),
    wbsRiskCreateNoTitle: await probe('post', `/projects/${id}/wbs/5/risks`, { risk_category_code: 'TECH', risk_cost: 10 }),
    estimation: await (async () => {
      const e = await projectEstimation(page, id);
      return { total_risks: e.total_risks, total_risk_exposure: e.total_risk_exposure, total_pert_estimate: e.total_pert_estimate };
    })(),
    health: await probe('get', '/dashboard/health-detailed'),
    costByWbs: await probe('post', '/reports/generate', { report_type: 'cost_by_wbs', filters: { project_id: id } }),
  };
  const t0 = Date.now();
  await page.request.get(`${API}/dashboard/health-detailed`, { headers });
  findings.healthDetailedMs = Date.now() - t0;
});

// ================================================================== 5. admin
test('admin: users list shows the seeded users', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/users');
  for (const u of SEED.users) await expect(page.getByRole('row').filter({ hasText: u.username })).toBeVisible();
  await shot(page, '13-admin-users');
});

test('admin: reset another user\'s password without a current password, then that user can sign in with it', async ({ page, browser }) => {
  const target = user('user');
  await login(page, 'admin');
  await page.goto('/admin/users');
  await page.getByRole('button', { name: `Reset password for ${target.username}` }).click();
  const dialog = page.getByRole('dialog', { name: /Reset password/ });
  await expect(dialog.getByLabel('Current password')).toHaveCount(0);
  await dialog.getByLabel(/^New password/).fill(NEW_USER_PASSWORD);
  await dialog.getByLabel('Confirm new password').fill(NEW_USER_PASSWORD);
  const put = page.waitForResponse((r) => r.url().endsWith(`/password`) && r.request().method() === 'PUT');
  await dialog.getByRole('button', { name: 'Update password' }).click();
  expect((await put).status()).toBe(200);

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, 'user', NEW_USER_PASSWORD);
  await ctx.close();
  // The old password no longer works
  const old = await page.request.post(`${API}/auth/login`, { form: { username: target.username, password: target.password } });
  expect(old.status()).toBe(401);
});

test('admin: config tables list loads and cost-types lists the seeded rows', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/config');
  await expect(page.getByRole('heading', { level: 1, name: 'Config Tables' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(Object.keys(SEED.config).length);
  await page.getByRole('tab', { name: 'Cost Types' }).click();
  const grid = page.getByRole('grid', { name: 'Cost Types items' });
  for (const [code, description] of SEED.config['cost-types']) {
    const row = grid.getByRole('row').filter({ hasText: code }).filter({ hasText: description });
    await expect(row).toBeVisible();
  }
  await shot(page, '14-admin-config-cost-types');
});

// Finding F-06: GET /admin/config/{weighted-table} omits `weight` (response_model is the unweighted ConfigItemResponse).
test('admin: probability levels show their weights', async ({ page }) => {
  knownBug('F-06: GET /admin/config/probability-levels returns items without `weight`, so the weight column is blank and forms treat every weight as 0');
  await login(page, 'admin');
  await page.goto('/admin/config');
  await page.getByRole('tab', { name: /Probability/ }).click();
  await expect(page.getByRole('grid').getByRole('row').filter({ hasText: 'HIGH' })).toContainText('0.6');
  await shot(page, '14b-admin-config-probability');
});

test('admin: audit logs show entries for the actions performed', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/audit-logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Audit Logs' })).toBeVisible();
  const grid = page.getByRole('grid').first();
  await expect(grid.getByRole('row').nth(1)).toBeVisible();
  // Server-side: which of this run's actions produced audit rows?
  const token = await apiToken(page);
  const res = await page.request.get(`${API}/admin/audit-logs?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
  const items = (await res.json()).items as { action: string; entity_type: string; user_agent: string | null }[];
  const real = items.filter((i) => i.user_agent !== SEED.audit_seed_marker);
  const seen = (action: string, entity: string) => real.some((i) => i.action === action && i.entity_type === entity);
  findings.auditActions = {
    SUBMIT_WBS: seen('SUBMIT', 'WBS'),
    APPROVE_WBS: seen('APPROVE', 'WBS'),
    PASSWORD_CHANGE_User: seen('PASSWORD_CHANGE', 'User'),
    CREATE_ResourceAssignment: items.some((i) => i.action === 'CREATE' && /assignment/i.test(i.entity_type)),
    CREATE_Risk: items.some((i) => i.action === 'CREATE' && /risk/i.test(i.entity_type)),
    LOGIN: items.some((i) => i.action === 'LOGIN' && i.user_agent !== SEED.audit_seed_marker),
  };
  expect(seen('SUBMIT', 'WBS')).toBe(true);
  expect(seen('APPROVE', 'WBS')).toBe(true);
  expect(seen('PASSWORD_CHANGE', 'User')).toBe(true);
  await shot(page, '15-admin-audit-logs');
});

// Finding F-11: creating an assignment / project risk / logging in is not written to the audit log.
test('audit log records assignment creation, project-risk creation and logins', async ({ page }) => {
  knownBug('F-11: no audit entries are written for assignment/risk CRUD or for logins');
  await login(page, 'admin');
  const res = await page.request.get(`${API}/admin/audit-logs?limit=500`, { headers: { Authorization: `Bearer ${await apiToken(page)}` } });
  const items = (await res.json()).items as { action: string; entity_type: string; user_agent: string | null }[];
  const real = items.filter((i) => i.user_agent !== SEED.audit_seed_marker);
  expect(real.some((i) => i.action === 'CREATE' && /assignment/i.test(i.entity_type))).toBe(true);
  expect(real.some((i) => i.action === 'CREATE' && /risk/i.test(i.entity_type))).toBe(true);
  expect(real.some((i) => i.action === 'LOGIN')).toBe(true);
});

// ================================================================== 6. manager
test('manager: what the UI shows for Administration, and what the API allows (recorded as findings)', async ({ page }) => {
  await login(page, 'manager');
  await shot(page, '16-dashboard-manager');
  const navAdmin = await page.getByText('Administration', { exact: true }).count();
  await page.goto('/admin/users');
  const notAuthorised = await page.getByRole('heading', { name: 'Not authorised' }).count();
  await shot(page, '17-manager-admin-users');
  const token = await apiToken(page);
  const headers = { Authorization: `Bearer ${token}` };
  const me = await (await page.request.get(`${API}/auth/me`, { headers })).json();

  const listUsers = await page.request.get(`${API}/admin/users`, { headers });
  const create = await page.request.post(`${API}/admin/users`, {
    headers,
    data: { username: 'smoke_rogue_admin', email: 'rogue@example.com', full_name: 'Rogue', password: 'RogueAdmin#2026', role: 'admin' },
  });
  const created = create.status() === 201 ? await create.json() : null;
  const selfPromote = await page.request.put(`${API}/admin/users/${me.id}`, { headers, data: { role: 'admin' } });
  const promotedRole = selfPromote.status() === 200 ? (await selfPromote.json()).role : null;

  // Clean up: remove the created user, restore own role, using whatever access we now have.
  const cleanup: Record<string, number | string> = {};
  if (created) cleanup.deleteCreated = (await page.request.delete(`${API}/admin/users/${created.id}`, { headers })).status();
  if (promotedRole === 'admin') cleanup.restoreRole = (await page.request.put(`${API}/admin/users/${me.id}`, { headers, data: { role: 'manager' } })).status();
  // Verify with an admin token that nothing is left behind.
  const adminLogin = await page.request.post(`${API}/auth/login`, { form: { username: user('admin').username, password: user('admin').password } });
  const adminHeaders = { Authorization: `Bearer ${(await adminLogin.json()).access_token}` };
  const users = (await (await page.request.get(`${API}/admin/users`, { headers: adminHeaders })).json()).items as { id: number; username: string; role: string }[];
  const leftover = users.filter((u) => u.username === 'smoke_rogue_admin');
  const managerNow = users.find((u) => u.id === me.id);
  if (leftover.length) for (const u of leftover) await page.request.delete(`${API}/admin/users/${u.id}`, { headers: adminHeaders });
  if (managerNow && managerNow.role !== 'manager') await page.request.put(`${API}/admin/users/${me.id}`, { headers: adminHeaders, data: { role: 'manager' } });

  findings.managerPermissions = {
    uiAdministrationNavItems: navAdmin,
    uiAdminUsersPageNotAuthorised: notAuthorised > 0,
    apiListUsers: listUsers.status(),
    apiCreateAdminUser: create.status(),
    apiCreatedRole: created?.role ?? null,
    apiSelfPromoteToAdmin: selfPromote.status(),
    apiSelfPromoteRole: promotedRole,
    cleanup,
    leftoverAfterCleanup: leftover.length,
    managerRoleRestored: managerNow?.role,
  };
  test.info().annotations.push({ type: 'manager-permissions', description: JSON.stringify(findings.managerPermissions) });
  // The UI hides Administration from managers (documented behaviour); the API result is a finding, not a failure.
  expect(navAdmin).toBe(0);
  expect(notAuthorised).toBeGreaterThan(0);
});

// ================================================================== 7. plain user
test('user: Administration is hidden and /admin/users says Not authorised', async ({ page }) => {
  await login(page, 'user', NEW_USER_PASSWORD);
  await expect(page.getByText('Administration', { exact: true })).toHaveCount(0);
  await shot(page, '18-dashboard-user');
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
  await shot(page, '19-user-not-authorised');
});

// Finding F-07: the estimation forms load their dropdown data from /admin/* (admin|manager only).
test('user: estimation forms get their dropdown data (resources, cost types, ...)', async ({ page }) => {
  knownBug('F-07: reference data is fetched from /admin/resources, /admin/config/*, which return 403 to role=user, so the assignment form has empty dropdowns');
  await login(page, 'user', NEW_USER_PASSWORD);
  const id = await projectId(page, projectOf('depot').name);
  await shimApproval(page, id); // F-01 workaround
  await openProject(page, id);
  await selectWbs(page, '1.2', 'Drainage');
  await page.getByRole('button', { name: 'Add Assignment' }).first().click();
  await page.getByRole('combobox', { name: 'Resource' }).click();
  await shot(page, '20-user-assignment-form');
  await expect(page.getByRole('option').first()).toBeVisible();
});

test('every page visited: summary of console errors and failed responses is written to diagnostics-summary.json', async () => {
  const diags = readDiags();
  const byKey = new Map<string, { n: number; tests: Set<string> }>();
  for (const d of diags) {
    const k = `${d.kind}: ${d.detail}`;
    const e = byKey.get(k) ?? { n: 0, tests: new Set<string>() };
    e.n += 1;
    e.tests.add(d.test);
    byKey.set(k, e);
  }
  const summary = [...byKey].map(([k, e]) => ({ count: e.n, entry: k, tests: [...e.tests] }));
  writeFileSync(path.join(OUT, 'diagnostics-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`diagnostics collected: ${diags.length}`);
  for (const x of summary) console.log(`  ${x.count}x ${x.entry}  [${x.tests.length} test(s)]`);
});

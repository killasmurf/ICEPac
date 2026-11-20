/**
 * Real-API check for the projects close-out: archive and restore through the UI, server-side sorting
 * and the status filter. No mocks. Needs a freshly seeded database (`python scripts/seed_smoke.py --reset`).
 * It leaves the data as it found it (the archived project is restored), so smoke.spec.ts still passes after it.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SEED = JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'scripts', 'seed_smoke_data.json'), 'utf8'));
const API = process.env.SMOKE_API_URL ?? 'http://localhost:8010/api/v1';

interface SeedProject { key: string; name: string; status: string }
const PROJECTS: SeedProject[] = SEED.projects;
const admin = SEED.users.find((u: { role: string }) => u.role === 'admin');
const names = PROJECTS.map((p) => p.name);
const byName = [...names].sort((a, b) => a.localeCompare(b));
const target = PROJECTS.find((p) => p.key === 'depot') as SeedProject;
const activeStatus = PROJECTS.filter((p) => p.status === 'active');
const draftStatus = PROJECTS.filter((p) => p.status === 'draft');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(admin.username);
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

async function token(page: Page): Promise<string> {
  const value = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(value).toBeTruthy();
  return value as string;
}

async function useTableView(page: Page) {
  await page.evaluate(() => localStorage.setItem('icepac.projectsView', 'table'));
}

/** Project names in the order the table shows them. */
async function tableOrder(page: Page): Promise<string[]> {
  const grid = page.getByRole('grid', { name: 'Projects' });
  await expect(grid).toBeVisible();
  return grid.getByRole('row').locator('a[href^="/projects/"]').allTextContents();
}

const listRequest = (params: Record<string, string>) => (r: { method(): string; url(): string }) => {
  if (r.method() !== 'GET' || !/\/projects\?/.test(r.url())) return false;
  const sp = new URL(r.url()).searchParams;
  return Object.entries(params).every(([k, v]) => sp.get(k) === v);
};

async function activeProjectsCard(page: Page) {
  await page.goto('/');
  const card = page.locator('.MuiCard-root', { has: page.getByText('Active projects', { exact: true }) });
  await expect(card.getByText(/^of \d+ projects?$/)).toBeVisible();
  return card.innerText();
}

test.describe.serial('projects close-out (real API)', () => {
  test('archive through the UI, find it under Archived, restore it, see it back in Active', async ({ page }) => {
    await login(page);
    const before = await activeProjectsCard(page);

    await page.goto('/projects');
    await expect(page.getByRole('link', { name: target.name })).toBeVisible();
    await page.getByRole('button', { name: `Archive ${target.name}` }).click();
    const archiveDialog = page.getByRole('dialog', { name: 'Archive project?' });
    await expect(archiveDialog).toContainText('restore it later from the Archived view');
    await archiveDialog.getByRole('button', { name: 'Archive project' }).click();
    await expect(page.getByText('Project archived')).toBeVisible();
    await expect(page.getByRole('link', { name: target.name })).toHaveCount(0);

    // Archived view: marked, no New project, Restore instead of Archive.
    const archivedList = page.waitForRequest(listRequest({ archived: 'true' }));
    await page.getByRole('button', { name: 'Archived', exact: true }).click();
    await archivedList;
    await expect(page).toHaveURL(/archived=1/);
    await expect(page.getByRole('link', { name: target.name })).toBeVisible();
    await expect(page.getByText('1 archived project')).toBeVisible();
    await expect(page.getByText('Archived', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Archive ${target.name}` })).toHaveCount(0);

    // The project page of an archived project still loads (the API returns it).
    const detail = await page.request.get(`${API}/projects/${await idOf(page, target.name, true)}`, {
      headers: { Authorization: `Bearer ${await token(page)}` },
    });
    expect(detail.status()).toBe(200);
    expect((await detail.json()).archived).toBe(true);

    await page.getByRole('button', { name: `Restore ${target.name}` }).click();
    const restoreDialog = page.getByRole('dialog', { name: 'Restore project?' });
    await restoreDialog.getByRole('button', { name: 'Restore project' }).click();
    await expect(page.getByText('Project restored')).toBeVisible();
    await expect(page.getByText('No archived projects')).toBeVisible();

    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(page).not.toHaveURL(/archived/);
    await expect(page.getByRole('link', { name: target.name })).toBeVisible();
    for (const n of names) await expect(page.getByRole('link', { name: n })).toBeVisible();

    // Dashboard: restored project is counted again, figures are back to where they started.
    expect(await activeProjectsCard(page)).toBe(before);
  });

  test('restoring an active project is refused by the API with 409', async ({ page }) => {
    await login(page);
    const id = await idOf(page, target.name, false);
    const res = await page.request.post(`${API}/projects/${id}/restore`, { headers: { Authorization: `Bearer ${await token(page)}` } });
    expect(res.status()).toBe(409);
  });

  test('table headers sort by name on the server, ascending then descending', async ({ page }) => {
    await login(page);
    await useTableView(page);
    await page.goto('/projects');
    await expect(page.getByRole('grid', { name: 'Projects' })).toBeVisible();

    const asc = page.waitForRequest(listRequest({ sort: 'name', order: 'asc' }));
    await page.getByRole('columnheader', { name: /^Project/ }).click();
    await asc;
    await expect.poll(() => tableOrder(page)).toEqual(byName);

    const desc = page.waitForRequest(listRequest({ sort: 'name', order: 'desc' }));
    await page.getByRole('columnheader', { name: /^Project/ }).click();
    await desc;
    await expect.poll(() => tableOrder(page)).toEqual([...byName].reverse());
    await expect(page).toHaveURL(/sort=name&order=desc/);

    await page.reload();
    await expect.poll(() => tableOrder(page)).toEqual([...byName].reverse());
  });

  test('card view Sort by select uses the same sort', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    const req = page.waitForRequest(listRequest({ sort: 'name', order: 'asc' }));
    await page.getByRole('combobox', { name: 'Sort by' }).click();
    await page.getByRole('option', { name: 'Name A to Z' }).click();
    await req;
    await expect
      .poll(() => page.locator('a[href^="/projects/"]').filter({ hasText: /\S/ }).allTextContents())
      .toEqual(byName);
  });

  test('status filter shows only matching projects', async ({ page }) => {
    await login(page);
    await useTableView(page);
    await page.goto('/projects');
    const req = page.waitForRequest(listRequest({ status: 'draft' }));
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Draft' }).click();
    await req;
    await expect.poll(() => tableOrder(page)).toEqual(draftStatus.map((p) => p.name));
    await expect(page).toHaveURL(/status=draft/);

    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Active', exact: true }).click();
    await expect.poll(async () => (await tableOrder(page)).sort()).toEqual(activeStatus.map((p) => p.name).sort());

    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Import failed' }).click();
    await expect(page.getByText('No projects match your filters')).toBeVisible();
  });
});

async function idOf(page: Page, name: string, archived: boolean): Promise<number> {
  const res = await page.request.get(`${API}/projects?archived=${archived}`, { headers: { Authorization: `Bearer ${await token(page)}` } });
  const found = (await res.json()).items.find((i: { project_name: string }) => i.project_name === name);
  expect(found, `project ${name} (archived=${archived})`).toBeTruthy();
  return found.id;
}

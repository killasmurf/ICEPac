import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

/**
 * Phase 4 gate: every route, light and dark, on both viewport projects.
 * No horizontal page scroll, no serious or critical axe violations, no console errors, no unmocked requests.
 */

interface Route {
  /** Used in the screenshot name. */
  name: string;
  path: string;
  auth: boolean;
}

const routes: Route[] = [
  { name: 'login', path: '/login', auth: false },
  { name: 'dashboard', path: '/', auth: true },
  { name: 'projects', path: '/projects', auth: true },
  { name: 'project-wbs', path: '/projects/1?tab=wbs', auth: true },
  { name: 'project-summary', path: '/projects/1?tab=summary', auth: true },
  { name: 'project-risks', path: '/projects/1?tab=risks', auth: true },
  { name: 'project-imports', path: '/projects/1?tab=imports', auth: true },
  { name: 'reports', path: '/reports', auth: true },
  { name: 'help', path: '/help', auth: true },
  { name: 'help-topic', path: '/help/1', auth: true },
  { name: 'admin', path: '/admin', auth: true },
  { name: 'admin-users', path: '/admin/users', auth: true },
  { name: 'admin-resources', path: '/admin/resources', auth: true },
  { name: 'admin-suppliers', path: '/admin/suppliers', auth: true },
  { name: 'admin-config', path: '/admin/config', auth: true },
  { name: 'admin-audit-logs', path: '/admin/audit-logs', auth: true },
];

/** Wait until the page has rendered real content (no skeletons, no busy regions) and transitions have settled. */
async function settled(page: Page) {
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForTimeout(600);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const route of routes) {
    test(`${route.name} (${scheme})`, async ({ page }, testInfo) => {
      const api: MockApiHandle = await mockApi(page);
      const problems: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`console: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`));
      page.on('response', (r) => {
        if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.request().method()} ${r.url()}`);
      });

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      if (route.auth) await loginAs(page, 'admin');
      await page.goto(route.path);
      await settled(page);

      const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(noScroll, 'no horizontal page scroll').toBe(true);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) })),
        'axe serious or critical violations',
      ).toEqual([]);

      expect(api.unmatched, 'API requests without a mock').toEqual([]);
      expect(problems, 'console errors and failed requests').toEqual([]);

      await saveScreenshot(page, testInfo, 'phase-4-final', `${route.name}-${scheme}`);
    });
  }
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

// Exclusions are page-body elements that Phase 4 rebuilds; they cannot be fixed without restyling the page.
const pages: { name: string; path: string; auth: boolean; ready: string; exclude?: string[] }[] = [
  { name: 'login', path: '/login', auth: false, ready: 'ICEPac Login' },
  // TODO(phase-4): Dashboard spinners have no accessible name (aria-progressbar-name); goes away with StatCard skeletons.
  { name: 'dashboard', path: '/', auth: true, ready: 'Dashboard', exclude: ['main .MuiCircularProgress-root'] },
  { name: 'projects', path: '/projects', auth: true, ready: 'Harbour Bridge Refurbishment' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const p of pages) {
    test(`no serious or critical axe violations: ${p.name} (${scheme})`, async ({ page }) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      if (p.auth) await loginAs(page, 'admin');
      await page.goto(p.path);
      await expect(page.getByText(p.ready).first()).toBeVisible();
      await page.waitForTimeout(500); // let transitions settle so contrast is measured on final colours
      let axe = new AxeBuilder({ page });
      for (const selector of p.exclude ?? []) axe = axe.exclude(selector);
      const results = await axe.analyze();
      const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) })),
      ).toEqual([]);
    });
  }
}

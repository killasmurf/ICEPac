import { test, expect, type Page } from '@playwright/test';
import { mockApi, loginAs, type MockApiHandle } from './fixtures/mockApi';

/** Phase 6 polish: route transition, loading bar, focus and keyboard. */

let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await loginAs(page, 'admin');
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

/** Client-side navigation without relying on a visible nav link (the sidebar is a drawer on mobile). */
async function navigate(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test.describe('route transition', () => {
  test('page heading does not move after navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await navigate(page, '/help');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Help/i);
    const before = await heading.boundingBox();
    await page.waitForTimeout(400);
    const after = await heading.boundingBox();
    expect(before).not.toBeNull();
    expect(after).toEqual(before);
  });

  test('query-string changes do not re-run the fade', async ({ page }) => {
    await page.goto('/projects/1?tab=wbs');
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    await page.waitForTimeout(400);
    await navigate(page, '/projects/1?tab=risks');
    await expect(page.getByRole('tab', { name: /risks/i })).toHaveAttribute('aria-selected', 'true');
    const opacity = await page.locator('main > div > div').first().evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });
});

test.describe('loading polish', () => {
  test('paging a table keeps the rows, never shows the skeleton, and shows the progress bar', async ({ page }) => {
    // Slow down page two so the in-between state is observable.
    await page.route(/\/api\/v1\/admin\/resources\?.*skip=10/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fallback();
    });
    await page.goto('/admin/resources');
    await expect(page.getByText('Resource 2 description')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toHaveCount(0);

    await page.getByRole('button', { name: /next page/i }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toBeVisible();
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
    await expect(page.getByText('Resource 2 description')).toBeVisible();

    await expect(page.getByText(/11.*12 of 12/)).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Loading data' })).toHaveCount(0);
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0);
  });

  test('the progress bar is 2px tall and sits at the bottom of the header', async ({ page }) => {
    await page.route(/\/api\/v1\/admin\/resources\?.*skip=10/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fallback();
    });
    await page.goto('/admin/resources');
    await expect(page.getByText('Resource 2 description')).toBeVisible();
    await page.getByRole('button', { name: /next page/i }).click();
    const bar = page.getByRole('progressbar', { name: 'Loading data' });
    await expect(bar).toBeVisible();
    const [barBox, headerBox] = await Promise.all([bar.boundingBox(), page.locator('header').first().boundingBox()]);
    expect(barBox?.height).toBe(2);
    // The header has a 1px bottom border, so the bar sits just inside it.
    const gap = (headerBox?.y ?? 0) + (headerBox?.height ?? 0) - ((barBox?.y ?? 0) + 2);
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  });
});

const GOLD = 'rgb(196, 164, 111)';
const NAVY = 'rgb(21, 51, 81)';

/** Describe the focused element and how its focus is drawn. */
async function focusState(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      name: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || el.tagName,
      tag: el.tagName,
      cls: el.outerHTML.slice(0, 160) + ' PARENT ' + (el.parentElement?.outerHTML.slice(0, 120) ?? ''),
      role: el.getAttribute('role'),
      id: el.id,
      inSidebar: Boolean(el.closest('nav[aria-label="Main navigation"]')),
      inHeader: Boolean(el.closest('header')),
      outlineStyle: cs.outlineStyle,
      outlineWidth: parseFloat(cs.outlineWidth),
      outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow,
    };
  });
}

test.describe('focus and keyboard', () => {
  test('first Tab on / focuses a visible "Skip to content" link that moves focus to main', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await expect(page.locator('main')).toHaveAttribute('id', 'main-content');
    // Not hidden away again when focus moves on, and not the focus ring around the whole page.
    expect((await focusState(page))?.outlineStyle).toBe('none');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`every Tab stop on / shows a focus ring, including the header (${scheme})`, async ({ page }) => {
      await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const stops = [];
      for (let i = 0; i < 24; i += 1) {
        await page.keyboard.press('Tab');
        const state = await focusState(page);
        if (state?.tag === 'BODY') break; // tabbed past the last control
        stops.push(state);
      }
      expect(stops.some((s) => s?.inHeader), 'header controls were reached').toBe(true);
      for (const s of stops) {
        expect(s, 'focused element').not.toBeNull();
        const drawn = (s!.outlineStyle !== 'none' && s!.outlineWidth > 0) || s!.boxShadow !== 'none';
        expect(drawn, `focus ring on ${JSON.stringify(s)}`).toBe(true);
        if (s!.outlineStyle !== 'none') {
          // Gold in the always-dark sidebar and in dark mode; navy on light surfaces.
          const expected = s!.inSidebar || scheme === 'dark' ? GOLD : NAVY;
          if (s!.name !== 'Skip to content') expect(s!.outlineColor, `ring colour on "${s!.name}"`).toBe(expected);
        }
      }
    });
  }

  test('closing the command palette returns focus to the search button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const trigger = page.getByRole('button', { name: /search/i }).filter({ visible: true }).first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('closing the mobile navigation drawer returns focus to the menu button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'drawer is mobile only');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('form and confirm dialogs return focus to the button that opened them', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Test User 2')).toBeVisible();

    const add = page.getByRole('button', { name: /^Add / }).first();
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(add).toBeFocused();

    const del = page.getByRole('button', { name: /^Delete user2/ });
    await del.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(del).toBeFocused();
  });
});

test.describe('icons and metadata', () => {
  test('index.html references the generated icons and each one is served', async ({ page, request }) => {
    await page.goto('/login');
    const hrefs = await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(expect.arrayContaining(['/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']));
    for (const href of hrefs) {
      const res = await request.get(href as string);
      expect(res.status(), href as string).toBe(200);
      expect(res.headers()['content-type']).toMatch(/image\//);
    }
    const manifest = await (await request.get('/manifest.json')).json();
    expect(manifest).toMatchObject({ name: 'ICEPac by Adalex Consulting', short_name: 'ICEPac', theme_color: '#153351', background_color: '#F5F7F9' });
  });
});

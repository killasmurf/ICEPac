import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, loginAs, MockApiHandle } from './fixtures/mockApi';
import { saveScreenshot } from './fixtures/screenshot';

const PHASE = 'phase-4';
const CORS = { 'access-control-allow-origin': '*' };
let api: MockApiHandle;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'light'));
});

test.afterEach(() => {
  expect(api.unmatched, 'API requests without a mock').toEqual([]);
});

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function fail500(page: Page, pattern: RegExp) {
  await page.route(pattern, (route) =>
    route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{"detail":"boom"}' }),
  );
}

// ---------- Login ----------

test.describe('login', () => {
  test('signs in with a form-encoded body and lands on ?next', async ({ page }, testInfo) => {
    await page.goto('/login?next=%2Fprojects');
    await expect(page.getByLabel('Username')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    await saveScreenshot(page, testInfo, PHASE, 'login-light');

    await page.getByLabel('Username').fill('jordan');
    await page.getByLabel('Password', { exact: true }).fill('s3cret & more');
    const req = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/auth/login'));
    await page.getByLabel('Password', { exact: true }).press('Enter');
    const request = await req;
    expect(request.headers()['content-type']).toContain('application/x-www-form-urlencoded');
    const body = new URLSearchParams(request.postData() ?? '');
    expect(body.get('username')).toBe('jordan');
    expect(body.get('password')).toBe('s3cret & more');
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('a failed sign-in shows an alert and stays on the page', async ({ page }) => {
    await page.route(/\/auth\/login$/, (route) =>
      route.fulfill({ status: 401, headers: CORS, contentType: 'application/json', body: '{"detail":"Bad credentials"}' }),
    );
    await page.goto('/login');
    await page.getByLabel('Username').fill('jordan');
    await page.getByLabel('Password', { exact: true }).fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Username')).toBeEnabled();
  });

  test('fields and button are disabled while submitting', async ({ page }) => {
    await page.route(/\/auth\/login$/, async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.fulfill({ status: 401, headers: CORS, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/login');
    await page.getByLabel('Username').fill('a');
    await page.getByLabel('Password', { exact: true }).fill('b');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByLabel('Username')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('the password toggle shows and hides the password', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('hunter2');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('brand panel shows on desktop and is absent on mobile', async ({ page }, testInfo) => {
    await page.goto('/login');
    const panel = page.getByTestId('login-brand-panel');
    if (testInfo.project.name === 'desktop') {
      await expect(panel).toBeVisible();
      await expect(panel).toContainText('Estimate with confidence.');
      await expect(panel).toContainText('Three-point PERT estimates');
    } else {
      await expect(panel).toBeHidden();
      await expect(page.locator('main').getByText('by Adalex Consulting').first()).toBeVisible();
    }
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test('dark mode screenshot', async ({ page }, testInfo) => {
    await page.addInitScript(() => window.localStorage.setItem('mui-mode', 'dark'));
    await page.goto('/login');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
    await saveScreenshot(page, testInfo, PHASE, 'login-dark');
  });

  test('a signed-in visitor is redirected away from /login', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/login?next=%2Fhelp');
    await expect(page).toHaveURL(/\/help$/);
  });
});

// ---------- Help ----------

test.describe('help', () => {
  test('lists topics with category chips and navigates to a topic', async ({ page }, testInfo) => {
    await loginAs(page, 'admin');
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Getting started with ICEPac/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Estimation' })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, PHASE, 'help-light');

    await page.getByRole('button', { name: 'Getting started' }).click();
    await expect(page.getByRole('link', { name: /Understanding PERT/ })).toHaveCount(0);

    await page.getByRole('link', { name: /Getting started with ICEPac/ }).click();
    await expect(page).toHaveURL(/\/help\/1$/);
  });

  test('search uses the search endpoint and shows an empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/help');
    await expect(page.getByRole('link', { name: /Understanding PERT/ })).toBeVisible();
    const req = page.waitForRequest((r) => r.url().includes('/help/search') && r.url().includes('q=pert'));
    await page.getByRole('searchbox', { name: 'Search help topics' }).fill('pert');
    await req;
    await expect(page.getByRole('link', { name: /Getting started/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Understanding PERT/ })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search help topics' }).fill('zzzz');
    await expect(page.getByText('No matching topics')).toBeVisible();
  });

  test('error state offers retry', async ({ page }) => {
    await loginAs(page, 'admin');
    await fail500(page, /\/api\/v1\/help\/topics(\?.*)?$/);
    await page.goto('/help');
    await expect(page.getByText('Could not load help topics')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('topic page shows sections in order and renders content as text', async ({ page }, testInfo) => {
    await loginAs(page, 'admin');
    await page.goto('/help/1');
    await expect(page.getByRole('heading', { name: 'Getting started with ICEPac', level: 1 })).toBeVisible();
    await expect(page.getByText('<script>window.__xss=1</script>')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(['Section 1', 'Section 2']);
    expect(await noHorizontalScroll(page)).toBe(true);
    await saveScreenshot(page, testInfo, PHASE, 'help-topic-light');
    await page.getByRole('link', { name: 'Back to Help' }).click();
    await expect(page).toHaveURL(/\/help$/);
  });

  test('unknown topic shows not found', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route(/\/api\/v1\/help\/topics\/99$/, (route) =>
      route.fulfill({ status: 404, headers: CORS, contentType: 'application/json', body: '{"detail":"nope"}' }),
    );
    await page.goto('/help/99');
    await expect(page.getByRole('heading', { name: 'Topic not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Help' })).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    for (const path of ['/help', '/help/1']) {
      test(`no serious axe violations: ${path} (${scheme})`, async ({ page }) => {
        await page.addInitScript((m) => window.localStorage.setItem('mui-mode', m), scheme);
        await loginAs(page, 'admin');
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await page.waitForTimeout(500);
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))).toEqual([]);
      });
    }
  }
});

// ---------- Dashboard ----------

test.describe('dashboard', () => {
  test('shows stat cards without the Admin card or any spinner', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active projects')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'System health' })).toBeVisible();
    await expect(page.locator('main').getByText('Admin', { exact: true })).toHaveCount(0);
    await expect(page.locator('main .MuiCircularProgress-root')).toHaveCount(0);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

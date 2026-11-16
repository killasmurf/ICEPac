import { test, expect } from '@playwright/test';
import { mockApi, loginAs } from './fixtures/mockApi';

// The Projects page fetches with useQuery, so a failed list raises the global error toast
// and the page shows its own error state.
test('projects page renders its error state when the list API returns 500', async ({ page }) => {
  await mockApi(page);
  await page.route(/\/api\/v1\/projects(\?.*)?$/, (route) =>
    route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Internal error' }),
    }),
  );
  await loginAs(page, 'admin');
  await page.goto('/projects');
  await expect(page.getByText('Could not load projects')).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { mockApi, loginAs } from './fixtures/mockApi';

// The Projects page still fetches with plain useEffect (Phase 4 converts it to useQuery),
// so no toast fires for its failure yet. This spec proves the app boots and degrades
// gracefully with QueryClientProvider and ToastProvider mounted. Once Phase 4 converts the
// page, extend it to assert getByRole('alert') for the error toast.
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
  await expect(page.getByText('Failed to load projects.')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
});

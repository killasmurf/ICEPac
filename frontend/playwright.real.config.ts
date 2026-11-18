import { defineConfig } from '@playwright/test';

/**
 * Real-API smoke suite. Unlike playwright.config.ts this has NO webServer and NO mocks:
 * start the API (port 8010), seed it and serve the built frontend (port 3240) first.
 * See docs/REAL_API_SMOKE.md.
 */
export default defineConfig({
  testDir: 'e2e-real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 40_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  globalSetup: './e2e-real/global-setup.ts',
  outputDir: 'e2e-real/__screenshots__/test-results',
  use: {
    baseURL: process.env.SMOKE_WEB_URL ?? 'http://localhost:3240',
    acceptDownloads: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }],
});

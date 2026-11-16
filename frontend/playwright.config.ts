import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
});

import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 3000);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.PW_PORT && !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
});

import type { Page, TestInfo } from '@playwright/test';

/**
 * Save a full-page screenshot to e2e/__screenshots__/<phase>/<name>-<project>.png.
 * These are review artefacts, not pixel-diff gates.
 */
export async function saveScreenshot(page: Page, testInfo: TestInfo, phase: string, name: string): Promise<void> {
  await page.screenshot({
    path: `e2e/__screenshots__/${phase}/${name}-${testInfo.project.name}.png`,
    fullPage: true,
  });
}

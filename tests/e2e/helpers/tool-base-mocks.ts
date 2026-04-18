import type { Page } from '@playwright/test';

export const E2E_PROJECT_ID = 'project-e2e-1';
export const E2E_PROJECT_NAME = 'Project E2E';
export const E2E_MODEL_ID = 'model-e2e-1';
export const E2E_MODEL_NAME = 'Model E2E';

export async function setupToolBaseMocks(page: Page): Promise<void> {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user-e2e', role: 'user' } }),
    });
  });

  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [{ id: E2E_PROJECT_ID, name: E2E_PROJECT_NAME }],
      }),
    });
  });

  await page.route('**/api/models', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        models: [{ id: E2E_MODEL_ID, name: E2E_MODEL_NAME, default: true }],
      }),
    });
  });
}
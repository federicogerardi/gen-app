import { expect, test } from '@playwright/test';

test('renders the login homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Gen App')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
  await expect(page.locator('#main-content')).toBeVisible();
});

test('reveals skip-link on keyboard navigation', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Salta al contenuto principale' });
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#main-content');
});

test('redirects unauthenticated users from protected routes', async ({ page }) => {
  await page.goto('/artifacts');
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/$/);
});

test('keeps protected-route redirect behavior on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#main-content')).toBeVisible();
});
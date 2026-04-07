import { expect, test } from '@playwright/test';

test('renders the login homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Gen App')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accedi con Google' })).toBeVisible();
});
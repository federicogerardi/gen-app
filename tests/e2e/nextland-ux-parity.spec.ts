import { expect, test } from '@playwright/test';
import { setupToolBaseMocks } from './helpers/tool-base-mocks';

test.describe('UX parity: nextland', () => {
  test('keyboard-only navigation reaches primary controls', async ({ page }) => {
    await setupToolBaseMocks(page);
    await page.goto('/tools/nextland');

    await expect(page.getByRole('heading', { name: 'NextLand' })).toBeVisible();

    const focusTrail: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase() ?? 'none');
      focusTrail.push(focusedTag);
    }

    expect(focusTrail.some((tag) => tag === 'button' || tag === 'input')).toBeTruthy();
    await expect(page.locator('[data-primary-action="true"]')).toBeVisible();
  });

  test('mobile 375px has no horizontal scroll', async ({ page }) => {
    await setupToolBaseMocks(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tools/nextland');

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });

    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test('layout remains usable at 200% zoom', async ({ page }) => {
    await setupToolBaseMocks(page);
    await page.goto('/tools/nextland');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'NextLand' })).toBeVisible();

    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    await expect(page.locator('.app-surface').first()).toContainText('Setup');
    await expect(page.locator('[data-primary-action="true"]')).toBeVisible();
  });

  test('focus visibility is present on keyboard focus', async ({ page }) => {
    await setupToolBaseMocks(page);
    await page.goto('/tools/nextland');

    await page.keyboard.press('Tab');

    const focusStyle = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return { outline: 'none', boxShadow: 'none' };
      const style = getComputedStyle(active);
      return { outline: style.outlineStyle, boxShadow: style.boxShadow };
    });

    const hasFocusIndicator = focusStyle.outline !== 'none' || focusStyle.boxShadow !== 'none';
    expect(hasFocusIndicator).toBeTruthy();
  });
});
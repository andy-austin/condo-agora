import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('sign-in page renders Clerk sign-in component', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(
      page.locator('.cl-rootBox, .cl-signIn-root, [data-clerk-component]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('sign-up page renders Clerk sign-up component', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(
      page.locator('.cl-rootBox, .cl-signUp-root, [data-clerk-component]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard is accessible and shows welcome message', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome');
  });

  test('dashboard navigation bar contains correct links', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop nav links are hidden on mobile');
    await page.goto('/dashboard');

    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Properties' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
  });
});

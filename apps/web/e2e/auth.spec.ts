import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders phone/OTP form', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.locator('input[type="tel"], input[type="email"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('login page shows WhatsApp and Email channel options', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /whatsapp/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /email/i })).toBeVisible({ timeout: 10_000 });
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

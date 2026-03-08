import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows welcome greeting', async ({ page }) => {
    // The heading shows "Welcome, {firstName}!" or "Welcome, User!" as fallback
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome');
  });

  test('properties navigation card links to /dashboard/properties', async ({ page }) => {
    const propertiesCard = page.getByRole('link', { name: /Properties/ }).filter({
      has: page.getByText('Manage houses and units'),
    });
    await expect(propertiesCard).toBeVisible();
    await expect(propertiesCard).toHaveAttribute('href', '/dashboard/properties');
  });

  test('settings navigation card links to /dashboard/settings', async ({ page }) => {
    const settingsCard = page.getByRole('link', { name: /Settings/ }).filter({
      has: page.getByText('Invite users and manage'),
    });
    await expect(settingsCard).toBeVisible();
    await expect(settingsCard).toHaveAttribute('href', '/dashboard/settings');
  });
});

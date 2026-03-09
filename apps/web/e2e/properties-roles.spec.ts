import { test, expect } from './fixtures/auth';

/**
 * Properties page — role-specific actions per role (Issue #67)
 * Uses real Clerk login to verify properties page adapts to each role.
 */

test.describe('Properties — Admin role', () => {
  test('admin sees Add Property button', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByRole('button', { name: /Add Property/i })).toBeVisible();
  });

  test('admin sees Delete buttons on property cards', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/properties');
    // Wait for properties to load
    await adminPage.waitForTimeout(2000);

    // If properties exist, admin should see delete buttons
    const deleteButtons = adminPage.getByRole('button', { name: 'Delete' });
    const propertyCount = await adminPage.locator('.grid > div').count();
    if (propertyCount > 0) {
      await expect(deleteButtons.first()).toBeVisible();
    }
  });

  test('admin sees Edit button on property detail page', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/properties');
    await adminPage.waitForTimeout(2000);

    // Click on the first property to go to detail
    const firstProperty = adminPage.locator('.grid > div').first();
    const propertyLink = firstProperty.locator('a').first();
    const hasProperties = await firstProperty.isVisible().catch(() => false);

    if (hasProperties) {
      await propertyLink.click();
      await expect(adminPage.getByRole('button', { name: 'Edit' })).toBeVisible();
    }
  });
});

test.describe('Properties — Resident role', () => {
  test('resident does NOT see Add Property button', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/properties');
    await residentPage.waitForTimeout(2000);
    await expect(residentPage.getByRole('button', { name: /Add Property/i })).not.toBeVisible();
  });

  test('resident does NOT see Delete buttons', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/properties');
    await residentPage.waitForTimeout(2000);
    await expect(residentPage.getByRole('button', { name: 'Delete' }).first()).not.toBeVisible();
  });
});

test.describe('Properties — Member role', () => {
  test('member does NOT see Add Property button', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/properties');
    await memberPage.waitForTimeout(2000);
    await expect(memberPage.getByRole('button', { name: /Add Property/i })).not.toBeVisible();
  });

  test('member does NOT see Delete buttons', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/properties');
    await memberPage.waitForTimeout(2000);
    await expect(memberPage.getByRole('button', { name: 'Delete' }).first()).not.toBeVisible();
  });
});

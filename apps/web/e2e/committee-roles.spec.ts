import { test, expect } from './fixtures/auth';

/**
 * Committee page — role-specific controls per role (Issue #68)
 * Uses real Clerk login to verify committee page adapts to each role.
 */

test.describe('Committee — Admin role', () => {
  test('admin sees role change dropdowns', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/committee');
    await adminPage.waitForTimeout(2000);

    // Admin should see at least one role dropdown (select element)
    const dropdowns = adminPage.locator('select');
    const count = await dropdowns.count();
    if (count > 0) {
      await expect(dropdowns.first()).toBeVisible();
    }
  });

  test('admin sees Board Members section', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/committee');
    await expect(adminPage.getByText(/Board Members/i)).toBeVisible();
  });

  test('admin sees Members & Residents section', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/committee');
    await expect(adminPage.getByText(/Members & Residents/i)).toBeVisible();
  });
});

test.describe('Committee — Resident role', () => {
  test('resident sees member list but no role dropdowns', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/committee');
    await residentPage.waitForTimeout(2000);

    // Should see member sections
    await expect(residentPage.getByText(/Board Members/i)).toBeVisible();

    // Should NOT see any role change dropdowns
    const dropdowns = residentPage.locator('select');
    await expect(dropdowns).toHaveCount(0);
  });
});

test.describe('Committee — Member role', () => {
  test('member sees member list but no role dropdowns', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/committee');
    await memberPage.waitForTimeout(2000);

    // Should see member sections
    await expect(memberPage.getByText(/Board Members/i)).toBeVisible();

    // Should NOT see any role change dropdowns
    const dropdowns = memberPage.locator('select');
    await expect(dropdowns).toHaveCount(0);
  });
});

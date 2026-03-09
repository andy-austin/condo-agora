import { test, expect } from './fixtures/auth';

/**
 * Dashboard page — role-specific content per role (Issue #66)
 * Uses real Clerk login to verify the dashboard adapts to each role.
 */

test.describe('Dashboard — Admin role', () => {
  test('admin sees Quick Actions section', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage.getByText('Quick Actions')).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /Add Property/i })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /Invite Member/i })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /Manage Committee/i })).toBeVisible();
  });

  test('admin sees stat cards', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage.getByText('Properties')).toBeVisible();
    await expect(adminPage.getByText('Members')).toBeVisible();
  });
});

test.describe('Dashboard — Resident role', () => {
  test('resident does NOT see Quick Actions section', async ({ residentPage }) => {
    await residentPage.goto('/dashboard');
    await expect(residentPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(residentPage.getByText('Quick Actions')).not.toBeVisible();
  });

  test('resident sees stat cards', async ({ residentPage }) => {
    await residentPage.goto('/dashboard');
    await expect(residentPage.getByText('Properties')).toBeVisible();
    await expect(residentPage.getByText('Members')).toBeVisible();
  });
});

test.describe('Dashboard — Member role', () => {
  test('member does NOT see Quick Actions section', async ({ memberPage }) => {
    await memberPage.goto('/dashboard');
    await expect(memberPage.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(memberPage.getByText('Quick Actions')).not.toBeVisible();
  });

  test('member sees stat cards', async ({ memberPage }) => {
    await memberPage.goto('/dashboard');
    await expect(memberPage.getByText('Properties')).toBeVisible();
    await expect(memberPage.getByText('Members')).toBeVisible();
  });
});

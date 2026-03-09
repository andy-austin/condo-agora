import { test, expect } from './fixtures/auth';

/**
 * Settings page — role-specific tabs and forms per role (Issue #69)
 * Uses real Clerk login to verify settings page adapts to each role.
 */

test.describe('Settings — Admin role', () => {
  test('admin sees invite form with email input and role selector', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings');
    await expect(adminPage.getByText('Invite New Member')).toBeVisible();
    await expect(adminPage.getByLabel('Email Address')).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /Send Invite/i })).toBeVisible();
  });

  test('admin sees members table', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings');
    await expect(adminPage.getByText('Members')).toBeVisible();
  });

  test('admin can search members', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings');
    const searchInput = adminPage.getByPlaceholder('Search members...');
    await expect(searchInput).toBeVisible();
  });

  test('admin sees organization tab with editable fields', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings?tab=organization');
    await expect(adminPage.getByText('Organization Profile')).toBeVisible();
    // Admin should NOT see the "only administrators" restriction message
    await expect(
      adminPage.getByText('Only administrators can edit organization details.')
    ).not.toBeVisible();
  });
});

test.describe('Settings — Resident role', () => {
  test('resident sees "only administrators" message instead of invite form', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/settings');
    await expect(
      residentPage.getByText('Only administrators can invite new members')
    ).toBeVisible();
    await expect(residentPage.getByLabel('Email Address')).not.toBeVisible();
  });

  test('resident sees members table', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/settings');
    await expect(residentPage.getByText('Members')).toBeVisible();
  });

  test('resident sees disabled org fields on organization tab', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/settings?tab=organization');
    await expect(
      residentPage.getByText('Only administrators can edit organization details.')
    ).toBeVisible();
  });
});

test.describe('Settings — Member role', () => {
  test('member sees "only administrators" message instead of invite form', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/settings');
    await expect(
      memberPage.getByText('Only administrators can invite new members')
    ).toBeVisible();
    await expect(memberPage.getByLabel('Email Address')).not.toBeVisible();
  });

  test('member sees members table', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/settings');
    await expect(memberPage.getByText('Members')).toBeVisible();
  });

  test('member sees disabled org fields on organization tab', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/settings?tab=organization');
    await expect(
      memberPage.getByText('Only administrators can edit organization details.')
    ).toBeVisible();
  });
});

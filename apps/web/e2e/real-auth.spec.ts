import { test, expect } from './fixtures/auth';

test.describe('Real Auth — Login per role', () => {
  test('admin can log in and reaches dashboard', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage).toHaveURL(/\/dashboard/);
    await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('resident can log in and reaches dashboard', async ({ residentPage }) => {
    await residentPage.goto('/dashboard');
    await expect(residentPage).toHaveURL(/\/dashboard/);
    await expect(residentPage.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('member can log in and reaches dashboard', async ({ memberPage }) => {
    await memberPage.goto('/dashboard');
    await expect(memberPage).toHaveURL(/\/dashboard/);
    await expect(memberPage.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('admin sees ADMIN role on settings page', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings');
    await expect(adminPage.getByText('ADMIN')).toBeVisible();
  });

  test('resident sees RESIDENT role on settings page', async ({ residentPage }) => {
    await residentPage.goto('/dashboard/settings');
    await expect(residentPage.getByText('RESIDENT')).toBeVisible();
  });

  test('member sees MEMBER role on settings page', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/settings');
    await expect(memberPage.getByText('MEMBER')).toBeVisible();
  });
});

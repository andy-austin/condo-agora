import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Error states — verify error handling UX (Issue #74)
 * Tests GraphQL failures, retry buttons, and invalid routes.
 */

test.describe('Error States', () => {
  test('GraphQL failure shows error state on dashboard', async ({ page }) => {
    // Mock Me query to fail
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Internal server error' }] }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByText(/something went wrong|could not load/i)).toBeVisible({ timeout: 10_000 });
  });

  test('GraphQL failure shows error state on properties page', async ({ page }) => {
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Internal server error' }] }),
      });
    });

    await page.goto('/dashboard/properties');
    await expect(page.getByText(/something went wrong|could not load|failed to load/i)).toBeVisible({ timeout: 10_000 });
  });

  test('error state shows Try Again button', async ({ page }) => {
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'Server error' }] }),
      });
    });

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const retryButton = page.getByRole('button', { name: /try again/i });
    const dashboardLink = page.getByRole('link', { name: /go to dashboard/i });

    // At least one recovery option should be visible
    const hasRetry = await retryButton.isVisible().catch(() => false);
    const hasDashboardLink = await dashboardLink.isVisible().catch(() => false);
    expect(hasRetry || hasDashboardLink).toBe(true);
  });

  test('invalid property ID shows error or not found', async ({ page }) => {
    await mockGraphQL(page, [
      {
        query: 'Me',
        response: {
          data: {
            me: {
              id: 'user_test',
              email: 'test@test.com',
              memberships: [{
                organization: { id: 'org_test', name: 'Test' },
                role: 'ADMIN',
              }],
            },
          },
        },
      },
      { query: 'GetHouse', response: { data: { house: null } } },
    ]);

    await page.goto('/dashboard/properties/invalid-id-12345');
    await expect(
      page.getByText(/not found|something went wrong|property not found/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

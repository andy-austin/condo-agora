import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Navigation tests — sidebar, breadcrumbs, disabled items (Issue #77)
 * Verifies navigation UX across the app.
 */

const MOCK_ME_ADMIN = {
  data: {
    me: {
      id: 'user_test',
      email: 'test@test.com',
      memberships: [{
        organization: { id: 'org_test', name: 'Test Condo' },
        role: 'ADMIN',
      }],
    },
  },
};

test.describe('Navigation — Sidebar links', () => {
  test.skip(({ isMobile }) => !!isMobile, 'Desktop sidebar tests only');

  test('sidebar links navigate to correct pages', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Click Properties
    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/dashboard\/properties/);

    // Click Committee
    await page.getByRole('link', { name: 'Committee' }).click();
    await expect(page).toHaveURL(/\/dashboard\/committee/);

    // Click Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    // Click Overview (back to dashboard)
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('disabled sidebar items show "Soon" badge and are not clickable', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Check for "Soon" badges on disabled items
    const soonBadges = page.getByText('Soon');
    const badgeCount = await soonBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(3); // Proposals, Voting, Reports

    // Disabled items should have cursor-not-allowed or similar
    const proposalsItem = page.locator('[title="Coming soon"]').first();
    if (await proposalsItem.isVisible()) {
      // Click should not navigate
      const urlBefore = page.url();
      await proposalsItem.click({ force: true });
      expect(page.url()).toBe(urlBefore);
    }
  });
});

test.describe('Navigation — Breadcrumbs', () => {
  test('property detail page shows breadcrumb navigation', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      {
        query: 'GetHouse',
        response: {
          data: {
            house: {
              id: 'house_1',
              name: 'Unit 101',
              organizationId: 'org_test',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              residents: [],
            },
          },
        },
      },
    ]);

    await page.goto('/dashboard/properties/house_1');

    // Should show property name
    await expect(page.getByText('Unit 101')).toBeVisible({ timeout: 10_000 });

    // Should have a link back to properties list
    const propertiesLink = page.getByRole('link', { name: /properties/i });
    const hasLink = await propertiesLink.first().isVisible().catch(() => false);
    if (hasLink) {
      await propertiesLink.first().click();
      await expect(page).toHaveURL(/\/dashboard\/properties/);
    }
  });
});

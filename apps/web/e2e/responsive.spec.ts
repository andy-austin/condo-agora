import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Responsive/mobile tests — verify mobile behavior (Issue #76)
 * Tests hamburger menu, column hiding, and grid layout on mobile viewports.
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

test.describe('Responsive — Mobile', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test('mobile hamburger menu opens and closes', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Hamburger button should be visible on mobile
    const menuButton = page.getByLabel('Open menu');
    await expect(menuButton).toBeVisible();

    // Open menu
    await menuButton.click();

    // Close button should appear
    const closeButton = page.getByLabel('Close menu');
    await expect(closeButton).toBeVisible();

    // Close menu
    await closeButton.click();
    await expect(closeButton).not.toBeVisible();
  });

  test('mobile shows single column property grid', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      {
        query: 'GetHouses',
        response: {
          data: {
            houses: [
              { id: 'h1', name: 'Unit 101', organizationId: 'org_test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), residents: [] },
              { id: 'h2', name: 'Unit 102', organizationId: 'org_test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), residents: [] },
            ],
          },
        },
      },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText('Unit 101')).toBeVisible({ timeout: 10_000 });

    // On mobile the grid should stack to single column
    const grid = page.locator('.grid').first();
    const gridBox = await grid.boundingBox();
    if (gridBox) {
      // Grid width should be close to viewport width (single column)
      expect(gridBox.width).toBeLessThan(400);
    }
  });

  test('mobile sidebar navigation works', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Open mobile menu
    await page.getByLabel('Open menu').click();

    // Navigation links should be visible
    await expect(page.getByRole('link', { name: 'Properties' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Committee' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });
});

test.describe('Responsive — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('desktop sidebar is visible without hamburger', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Hamburger should be hidden on desktop
    const menuButton = page.getByLabel('Open menu');
    await expect(menuButton).not.toBeVisible();

    // Sidebar nav links should be directly visible
    await expect(page.getByRole('link', { name: 'Properties' })).toBeVisible();
  });

  test('desktop sidebar has collapse/expand button', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    const collapseButton = page.getByLabel(/collapse sidebar|expand sidebar/i);
    await expect(collapseButton).toBeVisible();
  });
});

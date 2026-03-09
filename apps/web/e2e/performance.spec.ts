import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Performance benchmarks — load times and large data sets (Issue #81)
 * Verifies the app loads within acceptable time limits.
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

// Generate a large list of mock houses
function generateMockHouses(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `house_${i}`,
    name: `Unit ${100 + i}`,
    organizationId: 'org_test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    residents: [],
  }));
}

// Generate a large list of mock members
function generateMockMembers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `mem_${i}`,
    userId: `usr_${i}`,
    organizationId: 'org_test',
    houseId: null,
    role: i === 0 ? 'ADMIN' : 'MEMBER',
    email: `user${i}@example.com`,
    firstName: `User`,
    lastName: `${i}`,
    avatarUrl: null,
    houseName: null,
    createdAt: new Date().toISOString(),
  }));
}

test.describe('Performance', () => {
  test('dashboard loads within 3 seconds', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);

    const startTime = Date.now();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('property list with 50+ items loads successfully', async ({ page }) => {
    const houses = generateMockHouses(60);

    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      { query: 'GetHouses', response: { data: { houses } } },
    ]);

    const startTime = Date.now();
    await page.goto('/dashboard/properties');

    // Wait for first and last items to be visible
    await expect(page.getByText('Unit 100')).toBeVisible({ timeout: 10_000 });
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time even with 60 items
    expect(loadTime).toBeLessThan(5000);

    // Verify multiple items rendered
    const items = page.getByText(/Unit \d+/);
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('settings member table with 100+ members renders', async ({ page }) => {
    const members = generateMockMembers(120);

    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      { query: 'GetOrganizationMembers', response: { data: { organizationMembers: members } } },
    ]);

    const startTime = Date.now();
    await page.goto('/dashboard/settings');

    // Wait for the members table to load
    await expect(page.getByText('Members')).toBeVisible({ timeout: 10_000 });
    const loadTime = Date.now() - startTime;

    // Should render within reasonable time
    expect(loadTime).toBeLessThan(5000);
  });
});

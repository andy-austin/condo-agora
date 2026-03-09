import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Empty states — verify empty state UX across pages (Issue #75)
 * Uses mocked GraphQL to simulate empty data conditions.
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

test.describe('Empty States', () => {
  test('properties page with no properties shows empty state', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      { query: 'GetHouses', response: { data: { houses: [] } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText(/no properties yet/i)).toBeVisible({ timeout: 10_000 });
  });

  test('committee page with no members shows empty state', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      { query: 'GetOrganizationMembers', response: { data: { organizationMembers: [] } } },
    ]);

    await page.goto('/dashboard/committee');
    await expect(
      page.getByText(/no administrators found|no other members/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('settings member search with no results shows empty state', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MOCK_ME_ADMIN },
      {
        query: 'GetOrganizationMembers',
        response: {
          data: {
            organizationMembers: [{
              id: 'mem_1',
              userId: 'usr_1',
              organizationId: 'org_test',
              houseId: null,
              role: 'ADMIN',
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
              avatarUrl: null,
              houseName: null,
              createdAt: new Date().toISOString(),
            }],
          },
        },
      },
    ]);

    await page.goto('/dashboard/settings');
    const searchInput = page.getByPlaceholder('Search members...');
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill('nonexistent-user-xyz');

    await expect(page.getByText(/no members match/i)).toBeVisible({ timeout: 5_000 });
  });

  test('property detail with no residents shows empty message', async ({ page }) => {
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
    await expect(
      page.getByText(/no residents assigned/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

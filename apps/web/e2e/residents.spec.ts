import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

const ORG_ID = 'org_test_456';
const NOW = new Date().toISOString();

const ME_RESPONSE = {
  data: {
    me: {
      id: 'user_test_123',
      email: 'test@example.com',
      memberships: [
        {
          organization: { id: ORG_ID, name: 'Test Condo' },
          role: 'ADMIN',
        },
      ],
    },
  },
};

const HOUSE_WITH_RESIDENTS = {
  id: 'house_res',
  name: 'Unit 301',
  organizationId: ORG_ID,
  createdAt: NOW,
  updatedAt: NOW,
  residents: [
    {
      id: 'mem_1',
      userId: 'user_res_abc123',
      organizationId: ORG_ID,
      role: 'RESIDENT',
      createdAt: NOW,
    },
    {
      id: 'mem_2',
      userId: 'user_admin_def456',
      organizationId: ORG_ID,
      role: 'ADMIN',
      createdAt: NOW,
    },
  ],
};

const HOUSE_NO_RESIDENTS = {
  id: 'house_empty',
  name: 'Unit 302',
  organizationId: ORG_ID,
  createdAt: NOW,
  updatedAt: NOW,
  residents: [],
};

test.describe('Residents Management', () => {
  test('view residents on property — detail page shows resident list with role badges', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouse', response: { data: { house: HOUSE_WITH_RESIDENTS } } },
    ]);

    await page.goto(`/dashboard/properties/${HOUSE_WITH_RESIDENTS.id}`);

    // Residents heading
    await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();
    await expect(page.getByText('2 residents')).toBeVisible();

    // Role badges (use exact to avoid matching "Residents" heading)
    await expect(page.getByText('RESIDENT', { exact: true })).toBeVisible();
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
  });

  test('empty residents state — shows empty message with link to Settings', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouse', response: { data: { house: HOUSE_NO_RESIDENTS } } },
    ]);

    await page.goto(`/dashboard/properties/${HOUSE_NO_RESIDENTS.id}`);

    await expect(page.getByText('No residents assigned yet')).toBeVisible();

    // Use the Settings link within the main content (not the navbar one)
    const mainContent = page.locator('main');
    const settingsLink = mainContent.getByRole('link', { name: /settings/i });
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toHaveAttribute('href', '/dashboard/settings');
  });
});

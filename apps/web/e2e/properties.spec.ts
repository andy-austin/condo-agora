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

function makeHouse(id: string, name: string, residents: unknown[] = []) {
  return {
    id,
    name,
    organizationId: ORG_ID,
    createdAt: NOW,
    updatedAt: NOW,
    residents,
  };
}

const HOUSES = [
  makeHouse('house_1', 'Unit 101'),
  makeHouse('house_2', 'Unit 102'),
  makeHouse('house_3', 'Unit 103', [
    { id: 'mem_1', userId: 'user_res_1', role: 'RESIDENT' },
  ]),
];

test.describe('Properties CRUD', () => {
  test('list properties — grid renders with correct property cards', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
    ]);

    await page.goto('/dashboard/properties');

    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByText('Unit 102')).toBeVisible();
    await expect(page.getByText('Unit 103')).toBeVisible();
  });

  test('create property — open dialog, enter name, submit → new card appears', async ({
    page,
  }) => {
    const newHouse = makeHouse('house_new', 'Unit 201');

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
      { query: 'CreateHouse', response: { data: { createHouse: newHouse } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText('Unit 101')).toBeVisible();

    // Open create dialog — button says "+ Add Property"
    await page.getByRole('button', { name: '+ Add Property' }).click();

    // Fill in name (placeholder: "e.g. Unit 101, Block A - 404")
    await page.getByLabel('Property Name').fill('Unit 201');

    // Submit — button says "Create"
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('Unit 201')).toBeVisible();
  });

  test('view property detail — click property → detail page shows name + creation date', async ({
    page,
  }) => {
    const house = HOUSES[0];

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
      { query: 'GetHouse', response: { data: { house } } },
    ]);

    await page.goto('/dashboard/properties');

    // Click "View details" link for Unit 101
    await page.getByText('View details').first().click();

    await page.waitForURL(/\/dashboard\/properties\/house_1/);
    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByText(/Created/)).toBeVisible();
  });

  test('edit property name — click Edit, change name, Save → updated name displayed', async ({
    page,
  }) => {
    const house = HOUSES[0];
    const updatedHouse = { ...house, name: 'Unit 101A' };

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouse', response: { data: { house } } },
      { query: 'UpdateHouse', response: { data: { updateHouse: updatedHouse } } },
    ]);

    await page.goto(`/dashboard/properties/${house.id}`);
    await expect(page.getByText('Unit 101')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();

    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('Unit 101A');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Unit 101A')).toBeVisible();
  });

  test('edit property — click Cancel → original name preserved', async ({ page }) => {
    const house = HOUSES[0];

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouse', response: { data: { house } } },
    ]);

    await page.goto(`/dashboard/properties/${house.id}`);
    await expect(page.getByText('Unit 101')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();

    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('Changed Name');

    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });

    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByText('Changed Name')).not.toBeVisible();
  });

  test('delete property (no residents) — click Delete → property removed from list', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
      { query: 'DeleteHouse', response: { data: { deleteHouse: true } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText('Unit 101')).toBeVisible();

    // Find the Delete button within the Unit 101 card
    // Cards have: title, badge, "View details" link, "Delete" button
    const cards = page.locator('.grid > div');
    const unit101Card = cards.filter({ hasText: 'Unit 101' }).first();
    await unit101Card.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Unit 101')).not.toBeVisible();
  });

  test('delete property blocked — Delete button disabled when residents are assigned', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
    ]);

    await page.goto('/dashboard/properties');

    // Unit 103 has 1 resident — Delete should be disabled
    const cards = page.locator('.grid > div');
    const unit103Card = cards.filter({ hasText: 'Unit 103' }).first();
    const deleteBtn = unit103Card.getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).toBeDisabled();
  });

  test('auto-redirect — user with exactly 1 property is redirected to detail page', async ({
    page,
  }) => {
    const singleHouse = makeHouse('house_only', 'Only Unit');

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'GetHouses', response: { data: { houses: [singleHouse] } } },
      { query: 'GetHouse', response: { data: { house: singleHouse } } },
    ]);

    await page.goto('/dashboard/properties');

    await page.waitForURL(/\/dashboard\/properties\/house_only/, { timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

const ORG_ID = 'org_test_456';
const NOW = new Date().toISOString();

function makeMeResponse(role: string) {
  return {
    data: {
      me: {
        id: 'user_test_123',
        email: 'test@example.com',
        memberships: [
          {
            organization: { id: ORG_ID, name: 'Test Condo' },
            role,
          },
        ],
      },
    },
  };
}

function makeHouse(id: string, name: string, residents: unknown[] = []) {
  return {
    id,
    name,
    organizationId: ORG_ID,
    voterUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    residents,
  };
}

const HOUSES = [
  makeHouse('house_1', 'Unit 101'),
  makeHouse('house_2', 'Unit 102'),
];

test.describe('RBAC — Admin user', () => {
  test('admin sees Add Property button and Delete buttons', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('ADMIN') },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByRole('button', { name: '+ Add Property' })).toBeVisible();

    const cards = page.locator('.grid > div');
    const unit101Card = cards.filter({ hasText: 'Unit 101' }).first();
    await expect(unit101Card.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('admin sees Edit button on property detail page', async ({ page }) => {
    const house = HOUSES[0];

    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('ADMIN') },
      { query: 'GetHouse', response: { data: { house } } },
    ]);

    await page.goto(`/dashboard/properties/${house.id}`);
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  test('admin sees invitation form on settings page', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('ADMIN') },
    ]);

    await page.goto('/dashboard/settings');
    await expect(page.getByText('Invite New Member')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
  });
});

test.describe('RBAC — Non-admin user', () => {
  test('resident does NOT see Add Property button', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('RESIDENT') },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Property' })).not.toBeVisible();
  });

  test('resident does NOT see Delete buttons on property cards', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('RESIDENT') },
      { query: 'GetHouses', response: { data: { houses: HOUSES } } },
    ]);

    await page.goto('/dashboard/properties');
    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' }).first()).not.toBeVisible();
  });

  test('resident does NOT see Edit button on property detail page', async ({ page }) => {
    const house = HOUSES[0];

    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('RESIDENT') },
      { query: 'GetHouse', response: { data: { house } } },
    ]);

    await page.goto(`/dashboard/properties/${house.id}`);
    await expect(page.getByText('Unit 101')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();
  });

  test('member sees "only administrators" message on settings page', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('MEMBER') },
    ]);

    await page.goto('/dashboard/settings');
    await expect(
      page.getByText('Only administrators can invite new members')
    ).toBeVisible();
    await expect(page.getByLabel('Email Address')).not.toBeVisible();
  });

  test('settings page shows user role', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: makeMeResponse('RESIDENT') },
    ]);

    await page.goto('/dashboard/settings');
    await expect(page.getByText('RESIDENT')).toBeVisible();
  });
});

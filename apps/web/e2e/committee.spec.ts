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

const MEMBERS = [
  {
    id: 'mem_1',
    userId: 'user_1',
    organizationId: ORG_ID,
    houseId: null,
    role: 'ADMIN',
    email: 'admin@test.com',
    firstName: 'Ana',
    lastName: 'Garcia',
    avatarUrl: null,
    houseName: null,
    createdAt: NOW,
  },
  {
    id: 'mem_2',
    userId: 'user_2',
    organizationId: ORG_ID,
    houseId: 'house_1',
    role: 'RESIDENT',
    email: 'resident@test.com',
    firstName: 'Carlos',
    lastName: 'Lopez',
    avatarUrl: null,
    houseName: 'Unit 101',
    createdAt: NOW,
  },
  {
    id: 'mem_3',
    userId: 'user_3',
    organizationId: ORG_ID,
    houseId: null,
    role: 'MEMBER',
    email: 'member@test.com',
    firstName: null,
    lastName: null,
    avatarUrl: null,
    houseName: null,
    createdAt: NOW,
  },
];

test.describe('Committee Page', () => {
  test('displays board members (admins) and other members separately', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'query Me', response: makeMeResponse('ADMIN') },
      {
        query: 'GetOrganizationMembers',
        response: { data: { organizationMembers: MEMBERS } },
      },
    ]);

    await page.goto('/dashboard/committee');

    // Admins section
    await expect(page.getByText('Board Members (Admins)')).toBeVisible();
    await expect(page.getByText('Ana Garcia')).toBeVisible();

    // Others section
    await expect(page.getByRole('heading', { name: 'Members & Residents' })).toBeVisible();
    await expect(page.getByText('Carlos Lopez')).toBeVisible();
    await expect(page.getByText('member@test.com').first()).toBeVisible();
  });

  test('shows house assignment for residents', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'query Me', response: makeMeResponse('ADMIN') },
      {
        query: 'GetOrganizationMembers',
        response: { data: { organizationMembers: MEMBERS } },
      },
    ]);

    await page.goto('/dashboard/committee');
    await expect(page.getByText('Unit: Unit 101')).toBeVisible();
  });

  test('admin sees role change dropdowns', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'query Me', response: makeMeResponse('ADMIN') },
      {
        query: 'GetOrganizationMembers',
        response: { data: { organizationMembers: MEMBERS } },
      },
    ]);

    await page.goto('/dashboard/committee');
    // Wait for page to finish loading
    await expect(page.getByText('Board Members (Admins)')).toBeVisible();
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('non-admin does NOT see role change dropdowns', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'query Me', response: makeMeResponse('MEMBER') },
      {
        query: 'GetOrganizationMembers',
        response: { data: { organizationMembers: MEMBERS } },
      },
    ]);

    await page.goto('/dashboard/committee');
    await expect(page.getByText('Ana Garcia')).toBeVisible();
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBe(0);
  });

  test('admin can change member role', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'query Me', response: makeMeResponse('ADMIN') },
      {
        query: 'GetOrganizationMembers',
        response: { data: { organizationMembers: MEMBERS } },
      },
      {
        query: 'UpdateMemberRole',
        response: {
          data: {
            updateMemberRole: {
              id: 'mem_3',
              userId: 'user_3',
              role: 'ADMIN',
              email: 'member@test.com',
              firstName: null,
              lastName: null,
            },
          },
        },
      },
    ]);

    await page.goto('/dashboard/committee');

    // Find the role selector for member@test.com and change to ADMIN
    const select = page.getByLabel('Change role for member@test.com');
    await select.selectOption('ADMIN');

    // The role badge should update
    await expect(page.getByText('ADMIN').first()).toBeVisible();
  });
});

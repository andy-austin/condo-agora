import { test, expect, otpLogin, TEST_USERS } from './fixtures/auth';

/**
 * Resident assignment flow — assign/remove residents from houses (Issue #72)
 * Uses real auth with admin and resident fixtures.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type GqlResult = { data?: any; errors?: Array<{ message: string }> };
/* eslint-enable @typescript-eslint/no-explicit-any */

async function pageGql(
  page: import('@playwright/test').Page,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GqlResult> {
  const response = await page.request.post('/api/graphql', {
    data: { query, variables },
  });
  return response.json();
}

const ME_QUERY = `query Me { me { id memberships { organizationId } } }`;

const GET_MEMBERS = `
  query GetOrganizationMembers($organizationId: String!) {
    organizationMembers(organizationId: $organizationId) {
      id userId role email houseId
    }
  }
`;

const GET_HOUSES = `
  query GetHouses($organizationId: String!) {
    houses(organizationId: $organizationId) {
      id name residents { id userId }
    }
  }
`;

const CREATE_HOUSE = `
  mutation CreateHouse($organizationId: String!, $name: String!) {
    createHouse(organizationId: $organizationId, name: $name) { id name }
  }
`;

const DELETE_HOUSE = `
  mutation DeleteHouse($id: String!) { deleteHouse(id: $id) }
`;

const ASSIGN_RESIDENT = `
  mutation AssignResidentToHouse($userId: String!, $houseId: String!) {
    assignResidentToHouse(userId: $userId, houseId: $houseId) {
      id userId houseId role
    }
  }
`;

const REMOVE_RESIDENT = `
  mutation RemoveResidentFromHouse($userId: String!, $organizationId: String!) {
    removeResidentFromHouse(userId: $userId, organizationId: $organizationId) {
      id userId houseId role
    }
  }
`;

test.describe('Resident Assignment — Admin', () => {
  let organizationId: string;
  let testHouseId: string;
  let residentUserId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    const me = await pageGql(page, ME_QUERY);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;

    // Create a test house
    const house = await pageGql(page, CREATE_HOUSE, {
      organizationId,
      name: '[E2E] Assignment Test House',
    });
    testHouseId = house.data?.createHouse?.id;

    // Find a resident user
    const members = await pageGql(page, GET_MEMBERS, { organizationId });
    const resident = members.data?.organizationMembers?.find(
      (m: { role: string; houseId: string | null }) => m.role === 'RESIDENT' && !m.houseId
    );
    if (resident) {
      residentUserId = resident.userId;
    }

    await page.close();
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    // Remove assignment and delete test house
    if (residentUserId) {
      await pageGql(page, REMOVE_RESIDENT, { userId: residentUserId, organizationId });
    }
    if (testHouseId) {
      await pageGql(page, DELETE_HOUSE, { id: testHouseId });
    }
    await page.close();
    await context.close();
  });

  test('admin assigns resident to a house', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No unassigned resident found');

    await adminPage.goto('/');

    const result = await pageGql(adminPage, ASSIGN_RESIDENT, {
      userId: residentUserId,
      houseId: testHouseId,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.assignResidentToHouse?.houseId).toBeTruthy();
  });

  test('house shows assigned resident', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No resident was assigned');

    await adminPage.goto('/');

    const houses = await pageGql(adminPage, GET_HOUSES, { organizationId });
    const testHouse = houses.data?.houses?.find(
      (h: { id: string }) => h.id === testHouseId
    );

    expect(testHouse?.residents?.length).toBeGreaterThan(0);
  });

  test('admin removes resident from a house', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No resident to remove');

    await adminPage.goto('/');

    const result = await pageGql(adminPage, REMOVE_RESIDENT, {
      userId: residentUserId,
      organizationId,
    });

    expect(result.errors).toBeUndefined();

    // Verify house is now empty
    const houses = await pageGql(adminPage, GET_HOUSES, { organizationId });
    const testHouse = houses.data?.houses?.find(
      (h: { id: string }) => h.id === testHouseId
    );
    expect(testHouse?.residents?.length ?? 0).toBe(0);
  });
});

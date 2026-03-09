import { test, expect } from './fixtures/auth';
import { graphqlRequest } from './fixtures/graphql';

/**
 * Resident assignment flow — assign/remove residents from houses (Issue #72)
 * Uses real auth with admin and resident fixtures.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type GqlResult = { data?: any; errors?: Array<{ message: string }> };
/* eslint-enable @typescript-eslint/no-explicit-any */

async function getSessionToken(page: import('@playwright/test').Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === '__session')?.value;
}

async function gql(
  baseURL: string, query: string, variables?: Record<string, unknown>, token?: string,
): Promise<GqlResult> {
  return graphqlRequest(baseURL, query, variables, token) as Promise<GqlResult>;
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
  let baseURL: string;
  let token: string | undefined;
  let testHouseId: string;
  let residentUserId: string;

  test.beforeAll(async ({ browser }) => {
    const { clerkLogin, TEST_USERS: users } = await import('./fixtures/auth');
    const context = await browser.newContext();
    const page = await context.newPage();
    await clerkLogin(page, users.admin.email, users.admin.password);
    token = await getSessionToken(page);
    baseURL = page.url().replace(/\/dashboard.*/, '');
    const me = await gql(baseURL, ME_QUERY, {}, token);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;

    // Create a test house
    const house = await gql(baseURL, CREATE_HOUSE, {
      organizationId,
      name: '[E2E] Assignment Test House',
    }, token);
    testHouseId = house.data?.createHouse?.id;

    // Find a resident user
    const members = await gql(baseURL, GET_MEMBERS, { organizationId }, token);
    const resident = members.data?.organizationMembers?.find(
      (m: { role: string; houseId: string | null }) => m.role === 'RESIDENT' && !m.houseId
    );
    if (resident) {
      residentUserId = resident.userId;
    }

    await page.close();
    await context.close();
  });

  test.afterAll(async () => {
    // Remove assignment and delete test house
    if (residentUserId) {
      await gql(baseURL, REMOVE_RESIDENT, { userId: residentUserId, organizationId }, token);
    }
    if (testHouseId) {
      await gql(baseURL, DELETE_HOUSE, { id: testHouseId }, token);
    }
  });

  test('admin assigns resident to a house', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No unassigned resident found');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, ASSIGN_RESIDENT, {
      userId: residentUserId,
      houseId: testHouseId,
    }, tkn);

    expect(result.errors).toBeUndefined();
    expect(result.data?.assignResidentToHouse?.houseId).toBeTruthy();
  });

  test('house shows assigned resident', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No resident was assigned');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const houses = await gql(url, GET_HOUSES, { organizationId }, tkn);
    const testHouse = houses.data?.houses?.find(
      (h: { id: string }) => h.id === testHouseId
    );

    expect(testHouse?.residents?.length).toBeGreaterThan(0);
  });

  test('admin removes resident from a house', async ({ adminPage }) => {
    test.skip(!residentUserId, 'No resident to remove');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, REMOVE_RESIDENT, {
      userId: residentUserId,
      organizationId,
    }, tkn);

    expect(result.errors).toBeUndefined();

    // Verify house is now empty
    const houses = await gql(url, GET_HOUSES, { organizationId }, tkn);
    const testHouse = houses.data?.houses?.find(
      (h: { id: string }) => h.id === testHouseId
    );
    expect(testHouse?.residents?.length ?? 0).toBe(0);
  });
});

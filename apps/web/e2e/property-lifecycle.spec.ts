import { test, expect } from './fixtures/auth';
import { graphqlRequest } from './fixtures/graphql';

/**
 * Property CRUD lifecycle — end-to-end flows with real auth (Issue #70)
 * Admin creates, edits, and deletes properties through the real backend.
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

const CREATE_HOUSE = `
  mutation CreateHouse($organizationId: String!, $name: String!) {
    createHouse(organizationId: $organizationId, name: $name) { id name }
  }
`;

const DELETE_HOUSE = `
  mutation DeleteHouse($id: String!) { deleteHouse(id: $id) }
`;

test.describe('Property Lifecycle — Admin', () => {
  const createdHouseIds: string[] = [];
  let organizationId: string;
  let baseURL: string;
  let token: string | undefined;

  test.beforeAll(async ({ browser }) => {
    const { clerkLogin, TEST_USERS: users } = await import('./fixtures/auth');
    const context = await browser.newContext();
    const page = await context.newPage();
    await clerkLogin(page, users.admin.email, users.admin.password);
    token = await getSessionToken(page);
    baseURL = page.url().replace(/\/dashboard.*/, '');
    const me = await gql(baseURL, ME_QUERY, {}, token);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;
    await page.close();
    await context.close();
  });

  test.afterAll(async () => {
    for (const id of createdHouseIds) {
      await gql(baseURL, DELETE_HOUSE, { id }, token);
    }
  });

  test('admin creates property and it appears in list', async ({ adminPage }) => {
    const propertyName = `[E2E] Lifecycle ${Date.now()}`;
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, CREATE_HOUSE, { organizationId, name: propertyName }, tkn);
    expect(result.errors).toBeUndefined();
    createdHouseIds.push(result.data.createHouse.id);

    // Navigate to properties and verify it appears
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText(propertyName)).toBeVisible({ timeout: 10_000 });
  });

  test('admin edits property name and it updates', async ({ adminPage }) => {
    const originalName = `[E2E] Edit Test ${Date.now()}`;
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, CREATE_HOUSE, { organizationId, name: originalName }, tkn);
    const houseId = result.data.createHouse.id;
    createdHouseIds.push(houseId);

    // Update via GraphQL
    const updateResult = await gql(url, `
      mutation UpdateHouse($id: String!, $name: String!) {
        updateHouse(id: $id, name: $name) { id name }
      }
    `, { id: houseId, name: '[E2E] Updated Name' }, tkn);

    expect(updateResult.errors).toBeUndefined();
    expect(updateResult.data?.updateHouse?.name).toBe('[E2E] Updated Name');

    // Verify in properties list
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText('[E2E] Updated Name')).toBeVisible({ timeout: 10_000 });
  });

  test('admin deletes empty property and it is removed from list', async ({ adminPage }) => {
    const propertyName = `[E2E] To Delete ${Date.now()}`;
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, CREATE_HOUSE, { organizationId, name: propertyName }, tkn);
    const houseId = result.data.createHouse.id;

    // Verify it exists first
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText(propertyName)).toBeVisible({ timeout: 10_000 });

    // Delete via GraphQL
    const deleteResult = await gql(url, DELETE_HOUSE, { id: houseId }, tkn);
    expect(deleteResult.errors).toBeUndefined();

    // Refresh and verify it's gone
    await adminPage.reload();
    await expect(adminPage.getByText(propertyName)).not.toBeVisible({ timeout: 10_000 });
  });
});

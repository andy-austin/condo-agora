import { test, expect, otpLogin, TEST_USERS } from './fixtures/auth';

/**
 * Property CRUD lifecycle — end-to-end flows with real auth (Issue #70)
 * Admin creates, edits, and deletes properties through the real backend.
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

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    const me = await pageGql(page, ME_QUERY);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;
    await page.close();
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    for (const id of createdHouseIds) {
      await pageGql(page, DELETE_HOUSE, { id });
    }
    await page.close();
    await context.close();
  });

  test('admin creates property and it appears in list', async ({ adminPage }) => {
    const propertyName = `[E2E] Lifecycle ${Date.now()}`;
    await adminPage.goto('/');

    const result = await pageGql(adminPage, CREATE_HOUSE, { organizationId, name: propertyName });
    expect(result.errors).toBeUndefined();
    createdHouseIds.push(result.data.createHouse.id);

    // Navigate to properties and verify it appears
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText(propertyName)).toBeVisible({ timeout: 10_000 });
  });

  test('admin edits property name and it updates', async ({ adminPage }) => {
    const originalName = `[E2E] Edit Test ${Date.now()}`;
    await adminPage.goto('/');

    const result = await pageGql(adminPage, CREATE_HOUSE, { organizationId, name: originalName });
    const houseId = result.data.createHouse.id;
    createdHouseIds.push(houseId);

    // Update via GraphQL
    const updateResult = await pageGql(adminPage, `
      mutation UpdateHouse($id: String!, $name: String!) {
        updateHouse(id: $id, name: $name) { id name }
      }
    `, { id: houseId, name: '[E2E] Updated Name' });

    expect(updateResult.errors).toBeUndefined();
    expect(updateResult.data?.updateHouse?.name).toBe('[E2E] Updated Name');

    // Verify in properties list
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText('[E2E] Updated Name')).toBeVisible({ timeout: 10_000 });
  });

  test('admin deletes empty property and it is removed from list', async ({ adminPage }) => {
    const propertyName = `[E2E] To Delete ${Date.now()}`;
    await adminPage.goto('/');

    const result = await pageGql(adminPage, CREATE_HOUSE, { organizationId, name: propertyName });
    const houseId = result.data.createHouse.id;

    // Verify it exists first
    await adminPage.goto('/dashboard/properties');
    await expect(adminPage.getByText(propertyName)).toBeVisible({ timeout: 10_000 });

    // Delete via GraphQL
    const deleteResult = await pageGql(adminPage, DELETE_HOUSE, { id: houseId });
    expect(deleteResult.errors).toBeUndefined();

    // Refresh and verify it's gone
    await adminPage.reload();
    await expect(adminPage.getByText(propertyName)).not.toBeVisible({ timeout: 10_000 });
  });
});

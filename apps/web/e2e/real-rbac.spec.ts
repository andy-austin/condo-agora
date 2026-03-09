import { test, expect } from './fixtures/auth';
import { graphqlRequest } from './fixtures/graphql';

/**
 * Real RBAC tests — verify the backend actually enforces authorization.
 *
 * These tests use real Clerk login per role and hit the real backend.
 * They catch privilege escalation bugs that mocked tests cannot detect.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a session token from the page's cookies/storage for direct API calls. */
async function getSessionToken(page: import('@playwright/test').Page): Promise<string | undefined> {
  // Clerk stores the session JWT in a cookie named __session
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === '__session');
  return sessionCookie?.value;
}

const ME_QUERY = `
  query Me {
    me {
      id
      email
      memberships {
        organizationId
        role
        organization { id name }
      }
    }
  }
`;

const CREATE_HOUSE_MUTATION = `
  mutation CreateHouse($organizationId: String!, $name: String!) {
    createHouse(organizationId: $organizationId, name: $name) {
      id
      name
    }
  }
`;

const UPDATE_HOUSE_MUTATION = `
  mutation UpdateHouse($id: String!, $name: String!) {
    updateHouse(id: $id, name: $name) {
      id
      name
    }
  }
`;

const DELETE_HOUSE_MUTATION = `
  mutation DeleteHouse($id: String!) {
    deleteHouse(id: $id)
  }
`;

const CREATE_INVITATION_MUTATION = `
  mutation CreateInvitation($email: String!, $organizationId: String!, $role: Role!) {
    createInvitation(email: $email, organizationId: $organizationId, role: $role) {
      id
      email
    }
  }
`;

const UPDATE_MEMBER_ROLE_MUTATION = `
  mutation UpdateMemberRole($memberId: String!, $role: Role!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id
      role
    }
  }
`;

const GET_MEMBERS_QUERY = `
  query GetOrganizationMembers($organizationId: String!) {
    organizationMembers(organizationId: $organizationId) {
      id
      userId
      role
      email
    }
  }
`;

// ---------------------------------------------------------------------------
// Property mutation authorization (Issue #64)
// ---------------------------------------------------------------------------

test.describe('Real RBAC — Property mutations', () => {
  let adminToken: string | undefined;
  let residentToken: string | undefined;
  let memberToken: string | undefined;
  let organizationId: string;
  let createdHouseIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // We need to log in as admin to get the org ID
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Import and use the login helper
    const { clerkLogin, TEST_USERS: users } = await import('./fixtures/auth');
    await clerkLogin(adminPage, users.admin.email, users.admin.password);

    adminToken = await getSessionToken(adminPage);

    // Get org ID from the Me query
    const baseURL = adminPage.url().replace(/\/dashboard.*/, '');
    const meResult = await graphqlRequest(baseURL, ME_QUERY, {}, adminToken);
    organizationId = meResult.data?.me?.memberships?.[0]?.organizationId;

    await adminPage.close();
    await adminContext.close();
  });

  test.afterAll(async ({ browser }) => {
    // Clean up any houses created during tests
    if (createdHouseIds.length > 0 && adminToken) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('/');
      const baseURL = page.url().replace(/\/$/, '');
      await page.close();
      await context.close();

      for (const houseId of createdHouseIds) {
        await graphqlRequest(baseURL, DELETE_HOUSE_MUTATION, { id: houseId }, adminToken);
      }
    }
  });

  test('admin can create a property via GraphQL', async ({ adminPage }) => {
    const token = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Admin Created Property',
    }, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createHouse?.id).toBeTruthy();
    expect(result.data?.createHouse?.name).toBe('[E2E] Admin Created Property');

    // Track for cleanup
    createdHouseIds.push(result.data!.createHouse.id as string);
  });

  test('resident cannot create a property via GraphQL', async ({ residentPage }) => {
    const token = await getSessionToken(residentPage);
    await residentPage.goto('/');
    const baseURL = residentPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Resident Should Not Create',
    }, token);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('member cannot create a property via GraphQL', async ({ memberPage }) => {
    const token = await getSessionToken(memberPage);
    await memberPage.goto('/');
    const baseURL = memberPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Member Should Not Create',
    }, token);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can update a property via GraphQL', async ({ adminPage }) => {
    const token = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    // First create a house to update
    const createResult = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] To Update',
    }, token);
    const houseId = createResult.data?.createHouse?.id as string;
    createdHouseIds.push(houseId);

    // Now update it
    const result = await graphqlRequest(baseURL, UPDATE_HOUSE_MUTATION, {
      id: houseId,
      name: '[E2E] Updated Name',
    }, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateHouse?.name).toBe('[E2E] Updated Name');
  });

  test('resident cannot update a property via GraphQL', async ({ residentPage, adminPage }) => {
    const adminTkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    // Admin creates a house
    const createResult = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Resident Update Test',
    }, adminTkn);
    const houseId = createResult.data?.createHouse?.id as string;
    createdHouseIds.push(houseId);

    // Resident tries to update
    const residentTkn = await getSessionToken(residentPage);
    const result = await graphqlRequest(baseURL, UPDATE_HOUSE_MUTATION, {
      id: houseId,
      name: '[E2E] Unauthorized Update',
    }, residentTkn);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can delete a property via GraphQL', async ({ adminPage }) => {
    const token = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    // First create a house to delete
    const createResult = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] To Delete',
    }, token);
    const houseId = createResult.data?.createHouse?.id as string;

    // Delete it
    const result = await graphqlRequest(baseURL, DELETE_HOUSE_MUTATION, {
      id: houseId,
    }, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.deleteHouse).toBe(true);
  });

  test('member cannot delete a property via GraphQL', async ({ memberPage, adminPage }) => {
    const adminTkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    // Admin creates a house
    const createResult = await graphqlRequest(baseURL, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Member Delete Test',
    }, adminTkn);
    const houseId = createResult.data?.createHouse?.id as string;
    createdHouseIds.push(houseId);

    // Member tries to delete
    const memberTkn = await getSessionToken(memberPage);
    const result = await graphqlRequest(baseURL, DELETE_HOUSE_MUTATION, {
      id: houseId,
    }, memberTkn);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });
});

// ---------------------------------------------------------------------------
// Invitation & Role change authorization (Issue #65)
// ---------------------------------------------------------------------------

test.describe('Real RBAC — Invitation & role change mutations', () => {
  let organizationId: string;
  let nonAdminMemberId: string;

  test.beforeAll(async ({ browser }) => {
    const { clerkLogin, TEST_USERS: users } = await import('./fixtures/auth');

    const context = await browser.newContext();
    const page = await context.newPage();
    await clerkLogin(page, users.admin.email, users.admin.password);

    const token = await getSessionToken(page);
    const baseURL = page.url().replace(/\/dashboard.*/, '');

    // Get org ID
    const meResult = await graphqlRequest(baseURL, ME_QUERY, {}, token);
    organizationId = meResult.data?.me?.memberships?.[0]?.organizationId;

    // Get a non-admin member ID for role change tests
    const membersResult = await graphqlRequest(baseURL, GET_MEMBERS_QUERY, {
      organizationId,
    }, token);
    const members = membersResult.data?.organizationMembers as Array<{
      id: string;
      role: string;
      email: string;
    }>;
    const nonAdmin = members?.find((m) => m.role !== 'ADMIN');
    if (nonAdmin) {
      nonAdminMemberId = nonAdmin.id;
    }

    await page.close();
    await context.close();
  });

  test('admin can send an invitation via GraphQL', async ({ adminPage }) => {
    const token = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_INVITATION_MUTATION, {
      email: `e2e-test-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    }, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.id).toBeTruthy();
  });

  test('resident cannot send an invitation via GraphQL', async ({ residentPage }) => {
    const token = await getSessionToken(residentPage);
    await residentPage.goto('/');
    const baseURL = residentPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_INVITATION_MUTATION, {
      email: `e2e-unauthorized-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    }, token);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('member cannot send an invitation via GraphQL', async ({ memberPage }) => {
    const token = await getSessionToken(memberPage);
    await memberPage.goto('/');
    const baseURL = memberPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, CREATE_INVITATION_MUTATION, {
      email: `e2e-unauthorized-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    }, token);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can change a member role via GraphQL', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found for role change test');

    const token = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const baseURL = adminPage.url().replace(/\/$/, '');

    // Get the current role first so we can restore it
    const membersResult = await graphqlRequest(baseURL, GET_MEMBERS_QUERY, {
      organizationId,
    }, token);
    const members = membersResult.data?.organizationMembers as Array<{
      id: string;
      role: string;
    }>;
    const target = members?.find((m) => m.id === nonAdminMemberId);
    const originalRole = target?.role || 'MEMBER';

    // Change role
    const newRole = originalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    const result = await graphqlRequest(baseURL, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: newRole,
    }, token);

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe(newRole);

    // Restore original role
    await graphqlRequest(baseURL, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: originalRole,
    }, token);
  });

  test('resident cannot change a member role via GraphQL', async ({ residentPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found for role change test');

    const token = await getSessionToken(residentPage);
    await residentPage.goto('/');
    const baseURL = residentPage.url().replace(/\/$/, '');

    const result = await graphqlRequest(baseURL, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: 'ADMIN',
    }, token);

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });
});

import { test, expect, otpLogin, TEST_USERS } from './fixtures/auth';

/**
 * Real RBAC tests — verify the backend actually enforces authorization.
 *
 * These tests use real OTP login per role and hit the real backend.
 * They catch privilege escalation bugs that mocked tests cannot detect.
 */

// ---------------------------------------------------------------------------
// Types for GraphQL responses
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type GqlResult = { data?: any; errors?: Array<{ message: string }> };
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Send a typed GraphQL request through the page's session context. */
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
  let organizationId: string;
  const createdHouseIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await otpLogin(adminPage, TEST_USERS.admin.phone);

    const meResult = await pageGql(adminPage, ME_QUERY);
    organizationId = meResult.data?.me?.memberships?.[0]?.organizationId;

    await adminPage.close();
    await adminContext.close();
  });

  test.afterAll(async ({ browser }) => {
    if (createdHouseIds.length > 0) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await otpLogin(page, TEST_USERS.admin.phone);
      for (const houseId of createdHouseIds) {
        await pageGql(page, DELETE_HOUSE_MUTATION, { id: houseId });
      }
      await page.close();
      await context.close();
    }
  });

  test('admin can create a property via GraphQL', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(adminPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Admin Created Property',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createHouse?.id).toBeTruthy();
    expect(result.data?.createHouse?.name).toBe('[E2E] Admin Created Property');

    createdHouseIds.push(result.data.createHouse.id);
  });

  test('resident cannot create a property via GraphQL', async ({ residentPage }) => {
    await residentPage.goto('/');

    const result = await pageGql(residentPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Resident Should Not Create',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('member cannot create a property via GraphQL', async ({ memberPage }) => {
    await memberPage.goto('/');

    const result = await pageGql(memberPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Member Should Not Create',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can update a property via GraphQL', async ({ adminPage }) => {
    await adminPage.goto('/');

    const createResult = await pageGql(adminPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] To Update',
    });
    const houseId = createResult.data?.createHouse?.id;
    createdHouseIds.push(houseId);

    const result = await pageGql(adminPage, UPDATE_HOUSE_MUTATION, {
      id: houseId,
      name: '[E2E] Updated Name',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateHouse?.name).toBe('[E2E] Updated Name');
  });

  test('resident cannot update a property via GraphQL', async ({ residentPage, adminPage }) => {
    await adminPage.goto('/');

    const createResult = await pageGql(adminPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Resident Update Test',
    });
    const houseId = createResult.data?.createHouse?.id;
    createdHouseIds.push(houseId);

    const result = await pageGql(residentPage, UPDATE_HOUSE_MUTATION, {
      id: houseId,
      name: '[E2E] Unauthorized Update',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can delete a property via GraphQL', async ({ adminPage }) => {
    await adminPage.goto('/');

    const createResult = await pageGql(adminPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] To Delete',
    });
    const houseId = createResult.data?.createHouse?.id;

    const result = await pageGql(adminPage, DELETE_HOUSE_MUTATION, {
      id: houseId,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.deleteHouse).toBe(true);
  });

  test('member cannot delete a property via GraphQL', async ({ memberPage, adminPage }) => {
    await adminPage.goto('/');

    const createResult = await pageGql(adminPage, CREATE_HOUSE_MUTATION, {
      organizationId,
      name: '[E2E] Member Delete Test',
    });
    const houseId = createResult.data?.createHouse?.id;
    createdHouseIds.push(houseId);

    const result = await pageGql(memberPage, DELETE_HOUSE_MUTATION, {
      id: houseId,
    });

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
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);

    const meResult = await pageGql(page, ME_QUERY);
    organizationId = meResult.data?.me?.memberships?.[0]?.organizationId;

    const membersResult = await pageGql(page, GET_MEMBERS_QUERY, {
      organizationId,
    });
    const members = membersResult.data?.organizationMembers as
      | Array<{ id: string; role: string; email: string }>
      | undefined;
    const nonAdmin = members?.find((m) => m.role !== 'ADMIN');
    if (nonAdmin) {
      nonAdminMemberId = nonAdmin.id;
    }

    await page.close();
    await context.close();
  });

  test('admin can send an invitation via GraphQL', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(adminPage, CREATE_INVITATION_MUTATION, {
      email: `e2e-test-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.id).toBeTruthy();
  });

  test('resident cannot send an invitation via GraphQL', async ({ residentPage }) => {
    await residentPage.goto('/');

    const result = await pageGql(residentPage, CREATE_INVITATION_MUTATION, {
      email: `e2e-unauthorized-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('member cannot send an invitation via GraphQL', async ({ memberPage }) => {
    await memberPage.goto('/');

    const result = await pageGql(memberPage, CREATE_INVITATION_MUTATION, {
      email: `e2e-unauthorized-${Date.now()}@example.com`,
      organizationId,
      role: 'MEMBER',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });

  test('admin can change a member role via GraphQL', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found for role change test');

    await adminPage.goto('/');

    const membersResult = await pageGql(adminPage, GET_MEMBERS_QUERY, {
      organizationId,
    });
    const members = membersResult.data?.organizationMembers as
      | Array<{ id: string; role: string }>
      | undefined;
    const target = members?.find((m) => m.id === nonAdminMemberId);
    const originalRole = target?.role || 'MEMBER';

    const newRole = originalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    const result = await pageGql(adminPage, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: newRole,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe(newRole);

    // Restore original role
    await pageGql(adminPage, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: originalRole,
    });
  });

  test('resident cannot change a member role via GraphQL', async ({ residentPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found for role change test');

    await residentPage.goto('/');

    const result = await pageGql(residentPage, UPDATE_MEMBER_ROLE_MUTATION, {
      memberId: nonAdminMemberId,
      role: 'ADMIN',
    });

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toMatch(/admin|administrator|permission/i);
  });
});

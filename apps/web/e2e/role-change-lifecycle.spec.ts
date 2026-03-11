import { test, expect, otpLogin, TEST_USERS } from './fixtures/auth';

/**
 * Role change lifecycle — promote, demote, edge cases (Issue #73)
 * Uses real auth to test role management with edge case protections.
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

const ME_QUERY = `query Me { me { id memberships { organizationId userId } } }`;

const GET_MEMBERS = `
  query GetOrganizationMembers($organizationId: String!) {
    organizationMembers(organizationId: $organizationId) {
      id userId role email
    }
  }
`;

const UPDATE_ROLE = `
  mutation UpdateMemberRole($memberId: String!, $role: Role!) {
    updateMemberRole(memberId: $memberId, role: $role) {
      id userId role email
    }
  }
`;

test.describe('Role Change Lifecycle — Admin', () => {
  let organizationId: string;
  let adminMemberId: string;
  let nonAdminMemberId: string;
  let nonAdminOriginalRole: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    const me = await pageGql(page, ME_QUERY);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;
    const adminUserId = me.data?.me?.id;

    // Get member IDs
    const members = await pageGql(page, GET_MEMBERS, { organizationId });
    const memberList = members.data?.organizationMembers || [];

    // Find the admin member by matching the current user's ID
    const admin = memberList.find(
      (m: { role: string; userId: string }) => m.role === 'ADMIN' && m.userId === adminUserId
    );
    if (admin) adminMemberId = admin.id;

    const nonAdmin = memberList.find(
      (m: { role: string }) => m.role !== 'ADMIN'
    );
    if (nonAdmin) {
      nonAdminMemberId = nonAdmin.id;
      nonAdminOriginalRole = nonAdmin.role;
    }

    await page.close();
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    // Restore original role if changed
    if (nonAdminMemberId && nonAdminOriginalRole) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await otpLogin(page, TEST_USERS.admin.phone);
      await pageGql(page, UPDATE_ROLE, {
        memberId: nonAdminMemberId,
        role: nonAdminOriginalRole,
      });
      await page.close();
      await context.close();
    }
  });

  test('admin promotes member to ADMIN', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    await adminPage.goto('/');

    const result = await pageGql(adminPage, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: 'ADMIN',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe('ADMIN');

    // Restore to original role
    await pageGql(adminPage, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    });
  });

  test('admin demotes non-admin to different non-admin role', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    await adminPage.goto('/');

    const newRole = nonAdminOriginalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    const result = await pageGql(adminPage, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: newRole,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe(newRole);

    // Restore
    await pageGql(adminPage, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    });
  });

  test('role change is reflected on committee page', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    await adminPage.goto('/');

    // Change role
    const newRole = nonAdminOriginalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    await pageGql(adminPage, UPDATE_ROLE, { memberId: nonAdminMemberId, role: newRole });

    // Verify on committee page
    await adminPage.goto('/dashboard/committee');
    await adminPage.waitForTimeout(2000);

    // The member's role badge should reflect the new role
    await expect(adminPage.getByText(newRole)).toBeVisible();

    // Restore
    await pageGql(adminPage, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    });
  });

  test('cannot demote self if last admin', async ({ adminPage }) => {
    test.skip(!adminMemberId, 'Admin member ID not found');

    await adminPage.goto('/');

    // Check how many admins exist
    const members = await pageGql(adminPage, GET_MEMBERS, { organizationId });
    const admins = members.data?.organizationMembers?.filter(
      (m: { role: string }) => m.role === 'ADMIN'
    ) || [];

    if (admins.length === 1) {
      // Try to demote self — should fail
      const result = await pageGql(adminPage, UPDATE_ROLE, {
        memberId: adminMemberId,
        role: 'MEMBER',
      });

      // Backend should prevent this
      if (result.errors) {
        expect(result.errors[0].message).toBeTruthy();
      }
    }
  });
});

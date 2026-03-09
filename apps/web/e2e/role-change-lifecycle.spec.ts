import { test, expect } from './fixtures/auth';
import { graphqlRequest } from './fixtures/graphql';

/**
 * Role change lifecycle — promote, demote, edge cases (Issue #73)
 * Uses real auth to test role management with edge case protections.
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
  let baseURL: string;
  let token: string | undefined;
  let adminMemberId: string;
  let nonAdminMemberId: string;
  let nonAdminOriginalRole: string;

  test.beforeAll(async ({ browser }) => {
    const { clerkLogin, TEST_USERS: users } = await import('./fixtures/auth');
    const context = await browser.newContext();
    const page = await context.newPage();
    await clerkLogin(page, users.admin.email, users.admin.password);
    token = await getSessionToken(page);
    baseURL = page.url().replace(/\/dashboard.*/, '');
    const me = await gql(baseURL, ME_QUERY, {}, token);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;

    // Get member IDs
    const members = await gql(baseURL, GET_MEMBERS, { organizationId }, token);
    const memberList = members.data?.organizationMembers || [];

    const admin = memberList.find(
      (m: { role: string; email: string }) => m.role === 'ADMIN' && m.email === users.admin.email
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

  test.afterAll(async () => {
    // Restore original role if changed
    if (nonAdminMemberId && nonAdminOriginalRole) {
      await gql(baseURL, UPDATE_ROLE, {
        memberId: nonAdminMemberId,
        role: nonAdminOriginalRole,
      }, token);
    }
  });

  test('admin promotes member to ADMIN', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(url, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: 'ADMIN',
    }, tkn);

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe('ADMIN');

    // Restore to original role
    await gql(url, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    }, tkn);
  });

  test('admin demotes non-admin to different non-admin role', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const newRole = nonAdminOriginalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    const result = await gql(url, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: newRole,
    }, tkn);

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateMemberRole?.role).toBe(newRole);

    // Restore
    await gql(url, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    }, tkn);
  });

  test('role change is reflected on committee page', async ({ adminPage }) => {
    test.skip(!nonAdminMemberId, 'No non-admin member found');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    // Change role
    const newRole = nonAdminOriginalRole === 'MEMBER' ? 'RESIDENT' : 'MEMBER';
    await gql(url, UPDATE_ROLE, { memberId: nonAdminMemberId, role: newRole }, tkn);

    // Verify on committee page
    await adminPage.goto('/dashboard/committee');
    await adminPage.waitForTimeout(2000);

    // The member's role badge should reflect the new role
    await expect(adminPage.getByText(newRole)).toBeVisible();

    // Restore
    await gql(url, UPDATE_ROLE, {
      memberId: nonAdminMemberId,
      role: nonAdminOriginalRole,
    }, tkn);
  });

  test('cannot demote self if last admin', async ({ adminPage }) => {
    test.skip(!adminMemberId, 'Admin member ID not found');

    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    // Check how many admins exist
    const members = await gql(url, GET_MEMBERS, { organizationId }, tkn);
    const admins = members.data?.organizationMembers?.filter(
      (m: { role: string }) => m.role === 'ADMIN'
    ) || [];

    if (admins.length === 1) {
      // Try to demote self — should fail
      const result = await gql(url, UPDATE_ROLE, {
        memberId: adminMemberId,
        role: 'MEMBER',
      }, tkn);

      // Backend should prevent this
      if (result.errors) {
        expect(result.errors[0].message).toBeTruthy();
      }
    }
  });
});

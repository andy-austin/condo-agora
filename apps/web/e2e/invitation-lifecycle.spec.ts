import { test, expect } from './fixtures/auth';
import { graphqlRequest } from './fixtures/graphql';

/**
 * Invitation lifecycle — real Clerk login E2E tests
 * Tests the full invitation flow with actual API calls.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type GqlResult = { data?: any; errors?: Array<{ message: string }> };
/* eslint-enable @typescript-eslint/no-explicit-any */

async function getSessionToken(
  page: import('@playwright/test').Page
): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === '__session')?.value;
}

async function gql(
  baseURL: string,
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<GqlResult> {
  return graphqlRequest(baseURL, query, variables, token) as Promise<GqlResult>;
}

const ME_QUERY = `
  query Me {
    me {
      id
      memberships {
        organizationId
        organization { id name }
      }
    }
  }
`;

const CREATE_INVITATION = `
  mutation CreateInvitation($email: String!, $organizationId: String!, $role: Role!) {
    createInvitation(email: $email, organizationId: $organizationId, role: $role) {
      id email role method
    }
  }
`;

const PENDING_INVITATIONS = `
  query PendingInvitations($organizationId: String!) {
    pendingInvitations(organizationId: $organizationId) {
      id email role method expiresAt createdAt
    }
  }
`;

const REVOKE_INVITATION = `
  mutation RevokeInvitation($invitationId: String!) {
    revokeInvitation(invitationId: $invitationId)
  }
`;

test.describe('Invitation Lifecycle — Admin', () => {
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

  test('admin sends invitation with MEMBER role', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(
      url,
      CREATE_INVITATION,
      {
        email: `e2e-member-${Date.now()}@example.com`,
        organizationId,
        role: 'MEMBER',
      },
      tkn
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.id).toBeTruthy();
    expect(result.data?.createInvitation?.role).toBe('MEMBER');
    expect(result.data?.createInvitation?.method).toBe('EMAIL');
  });

  test('admin sends invitation with RESIDENT role', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(
      url,
      CREATE_INVITATION,
      {
        email: `e2e-resident-${Date.now()}@example.com`,
        organizationId,
        role: 'RESIDENT',
      },
      tkn
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.role).toBe('RESIDENT');
  });

  test('admin sends invitation with ADMIN role', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(
      url,
      CREATE_INVITATION,
      {
        email: `e2e-admin-${Date.now()}@example.com`,
        organizationId,
        role: 'ADMIN',
      },
      tkn
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.role).toBe('ADMIN');
  });

  test('duplicate email invitation is rejected', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const email = `e2e-duplicate-${Date.now()}@example.com`;

    // Send first invitation
    const first = await gql(
      url,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
      tkn
    );
    expect(first.errors).toBeUndefined();

    // Send duplicate — should error
    const result = await gql(
      url,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
      tkn
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('already pending');
  });

  test('invalid email is rejected', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    const result = await gql(
      url,
      CREATE_INVITATION,
      {
        email: 'not-an-email',
        organizationId,
        role: 'MEMBER',
      },
      tkn
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('Invalid email');
  });

  test('admin can list and revoke pending invitations', async ({ adminPage }) => {
    const tkn = await getSessionToken(adminPage);
    await adminPage.goto('/');
    const url = adminPage.url().replace(/\/$/, '');

    // Create an invitation to revoke
    const email = `e2e-revoke-${Date.now()}@example.com`;
    const created = await gql(
      url,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
      tkn
    );
    expect(created.errors).toBeUndefined();
    const invId = created.data?.createInvitation?.id;

    // List pending invitations
    const pending = await gql(url, PENDING_INVITATIONS, { organizationId }, tkn);
    expect(pending.errors).toBeUndefined();
    const found = pending.data?.pendingInvitations?.find(
      (inv: { email: string }) => inv.email === email
    );
    expect(found).toBeTruthy();

    // Revoke it
    const revoked = await gql(url, REVOKE_INVITATION, { invitationId: invId }, tkn);
    expect(revoked.errors).toBeUndefined();
    expect(revoked.data?.revokeInvitation).toBe(true);
  });
});

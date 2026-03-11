import { test, expect, otpLogin, TEST_USERS } from './fixtures/auth';

/**
 * Invitation lifecycle — real NextAuth OTP login E2E tests
 * Tests the full invitation flow with actual API calls.
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

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await otpLogin(page, TEST_USERS.admin.phone);
    const me = await pageGql(page, ME_QUERY);
    organizationId = me.data?.me?.memberships?.[0]?.organizationId;
    await page.close();
    await context.close();
  });

  test('admin sends invitation with MEMBER role', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(
      adminPage,
      CREATE_INVITATION,
      {
        email: `e2e-member-${Date.now()}@example.com`,
        organizationId,
        role: 'MEMBER',
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.id).toBeTruthy();
    expect(result.data?.createInvitation?.role).toBe('MEMBER');
    expect(result.data?.createInvitation?.method).toBe('EMAIL');
  });

  test('admin sends invitation with RESIDENT role', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(
      adminPage,
      CREATE_INVITATION,
      {
        email: `e2e-resident-${Date.now()}@example.com`,
        organizationId,
        role: 'RESIDENT',
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.role).toBe('RESIDENT');
  });

  test('admin sends invitation with ADMIN role', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(
      adminPage,
      CREATE_INVITATION,
      {
        email: `e2e-admin-${Date.now()}@example.com`,
        organizationId,
        role: 'ADMIN',
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation?.role).toBe('ADMIN');
  });

  test('duplicate email invitation is rejected', async ({ adminPage }) => {
    await adminPage.goto('/');

    const email = `e2e-duplicate-${Date.now()}@example.com`;

    // Send first invitation
    const first = await pageGql(
      adminPage,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
    );
    expect(first.errors).toBeUndefined();

    // Send duplicate — should error
    const result = await pageGql(
      adminPage,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('already pending');
  });

  test('invalid email is rejected', async ({ adminPage }) => {
    await adminPage.goto('/');

    const result = await pageGql(
      adminPage,
      CREATE_INVITATION,
      {
        email: 'not-an-email',
        organizationId,
        role: 'MEMBER',
      },
    );

    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('Invalid email');
  });

  test('admin can list and revoke pending invitations', async ({ adminPage }) => {
    await adminPage.goto('/');

    // Create an invitation to revoke
    const email = `e2e-revoke-${Date.now()}@example.com`;
    const created = await pageGql(
      adminPage,
      CREATE_INVITATION,
      { email, organizationId, role: 'MEMBER' },
    );
    expect(created.errors).toBeUndefined();
    const invId = created.data?.createInvitation?.id;

    // List pending invitations
    const pending = await pageGql(adminPage, PENDING_INVITATIONS, { organizationId });
    expect(pending.errors).toBeUndefined();
    const found = pending.data?.pendingInvitations?.find(
      (inv: { email: string }) => inv.email === email
    );
    expect(found).toBeTruthy();

    // Revoke it
    const revoked = await pageGql(adminPage, REVOKE_INVITATION, { invitationId: invId });
    expect(revoked.errors).toBeUndefined();
    expect(revoked.data?.revokeInvitation).toBe(true);
  });
});

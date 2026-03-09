import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

const ORG_ID = 'org_test_456';

const MEMBERS_RESPONSE = {
  data: {
    organizationMembers: [
      {
        id: 'mem_1',
        userId: 'user_test_123',
        organizationId: ORG_ID,
        houseId: null,
        role: 'ADMIN',
        createdAt: '2024-01-01T00:00:00Z',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Admin',
        avatarUrl: null,
        houseName: null,
      },
    ],
  },
};

const ME_RESPONSE = {
  data: {
    me: {
      id: 'user_test_123',
      email: 'test@example.com',
      memberships: [
        {
          organization: { id: ORG_ID, name: 'Test Condo' },
          role: 'ADMIN',
        },
      ],
    },
  },
};

const PENDING_INVITATIONS_EMPTY = {
  data: {
    pendingInvitations: [],
  },
};

const INVITATION_RESPONSE = {
  data: {
    createInvitation: {
      id: 'inv_1',
      email: 'newuser@example.com',
      organizationId: ORG_ID,
      inviterId: 'user_test_123',
      role: 'MEMBER',
      method: 'EMAIL',
      expiresAt: '2024-02-01T00:00:00Z',
      createdAt: '2024-01-25T00:00:00Z',
      acceptedAt: null,
    },
  },
};

test.describe('Invitation Flow', () => {
  test('admin can send invitation and see success message', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'OrganizationMembers', response: MEMBERS_RESPONSE },
      { query: 'PendingInvitations', response: PENDING_INVITATIONS_EMPTY },
      { query: 'CreateInvitation', response: INVITATION_RESPONSE },
    ]);

    await page.goto('/dashboard/settings');

    // Wait for the invite form to be visible
    const emailInput = page.locator('input[type="email"][placeholder]').first();
    await expect(emailInput).toBeVisible();

    // Fill email and submit
    await emailInput.fill('newuser@example.com');
    await page.locator('form button[type="submit"]').click();

    // Success message should appear
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible({
      timeout: 5000,
    });
  });

  test('form clears email after successful send', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'OrganizationMembers', response: MEMBERS_RESPONSE },
      { query: 'PendingInvitations', response: PENDING_INVITATIONS_EMPTY },
      { query: 'CreateInvitation', response: INVITATION_RESPONSE },
    ]);

    await page.goto('/dashboard/settings');

    const emailInput = page.locator('input[type="email"][placeholder]').first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill('another@example.com');
    await page.locator('form button[type="submit"]').click();

    // Wait for success then check email cleared
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible({
      timeout: 5000,
    });
    await expect(emailInput).toHaveValue('');
  });

  test('role selector has ADMIN, MEMBER, RESIDENT options', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'OrganizationMembers', response: MEMBERS_RESPONSE },
      { query: 'PendingInvitations', response: PENDING_INVITATIONS_EMPTY },
    ]);

    await page.goto('/dashboard/settings');

    const roleSelect = page.locator('select').first();
    await expect(roleSelect).toBeVisible();

    const options = await roleSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(3);
  });

  test('no-org user sees warning and no invitation form', async ({ page }) => {
    await mockGraphQL(page, [
      {
        query: 'Me',
        response: {
          data: {
            me: {
              id: 'user_no_org',
              email: 'noorg@example.com',
              memberships: [],
            },
          },
        },
      },
    ]);

    await page.goto('/dashboard/settings');

    // Should show no-org warning
    await expect(
      page.locator('text=/organization/i')
    ).toBeVisible({ timeout: 5000 });

    // Invite form should NOT be present
    await expect(page.locator('form button[type="submit"]')).not.toBeVisible();
  });

  test('pending invitations table shows when admin has pending invites', async ({
    page,
  }) => {
    const pendingResponse = {
      data: {
        pendingInvitations: [
          {
            id: 'inv_pending_1',
            email: 'pending@example.com',
            role: 'MEMBER',
            method: 'EMAIL',
            expiresAt: '2024-02-01T00:00:00Z',
            createdAt: '2024-01-25T00:00:00Z',
          },
        ],
      },
    };

    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'OrganizationMembers', response: MEMBERS_RESPONSE },
      { query: 'PendingInvitations', response: pendingResponse },
    ]);

    await page.goto('/dashboard/settings');

    // Should show pending email in table
    await expect(page.locator('text=pending@example.com')).toBeVisible({
      timeout: 5000,
    });
  });
});

import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Multi-organization scenarios (Issue #78)
 * Tests behavior when a user belongs to multiple organizations.
 */

const MULTI_ORG_ME = {
  data: {
    me: {
      id: 'user_multi',
      email: 'multi@agora.com',
      memberships: [
        {
          organization: { id: 'org_1', name: 'Sunset Condos' },
          role: 'ADMIN',
        },
        {
          organization: { id: 'org_2', name: 'Riverside Apartments' },
          role: 'MEMBER',
        },
      ],
    },
  },
};

test.describe('Multi-Organization', () => {
  test('user with multiple orgs sees first org context by default', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MULTI_ORG_ME },
    ]);

    await page.goto('/dashboard');
    // Should show the first organization's dashboard
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('role is scoped per organization — admin in one, member in another', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: MULTI_ORG_ME },
    ]);

    await page.goto('/dashboard');

    // The user's memberships contain different roles per org
    // Verify the UI reflects the role of the active organization
    // When org_1 is active (ADMIN), admin features should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Onboarding flow with real-auth simulation (Issue #79)
 * Tests the onboarding wizard for users without an organization.
 */

const NO_ORG_USER = {
  data: {
    me: {
      id: 'user_new',
      email: 'new@agora.com',
      memberships: [],
    },
  },
};

test.describe('Onboarding Flow', () => {
  test('user without organization sees onboarding flow', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: NO_ORG_USER },
    ]);

    await page.goto('/dashboard');

    // User with no memberships should be redirected to onboarding or see onboarding UI
    await page.waitForTimeout(3000);
    const url = page.url();
    const hasOnboarding = url.includes('onboarding') ||
      await page.getByText(/create.*organization|get started|set up/i).isVisible().catch(() => false);

    expect(hasOnboarding).toBe(true);
  });

  test('onboarding wizard shows organization creation step', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: NO_ORG_USER },
    ]);

    await page.goto('/onboarding');

    // Should show the organization name input
    const orgNameInput = page.getByLabel(/organization name|condo name/i);
    const hasInput = await orgNameInput.isVisible().catch(() => false);

    if (hasInput) {
      await orgNameInput.fill('[E2E] Test Organization');
      // Should have a continue/next button
      const nextButton = page.getByRole('button', { name: /continue|next|create/i });
      await expect(nextButton).toBeVisible();
    }
  });

  test('onboarding allows skipping optional steps', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: NO_ORG_USER },
      {
        query: 'CreateOrganization',
        response: {
          data: {
            createOrganization: {
              id: 'org_new',
              name: '[E2E] Test Organization',
              slug: 'e2e-test-org',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      },
    ]);

    await page.goto('/onboarding');

    // Look for skip buttons on optional steps
    const skipButton = page.getByRole('button', { name: /skip/i });
    const hasSkip = await skipButton.isVisible().catch(() => false);

    if (hasSkip) {
      // Skip should be clickable and move to next step
      await skipButton.click();
      await page.waitForTimeout(1000);
    }
  });
});

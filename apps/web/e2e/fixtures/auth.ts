import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Authentication fixtures for E2E tests.
 *
 * Two strategies available:
 * 1. `authedPage` — Uses real Clerk login (cached via storageState) for full integration tests.
 *    Credentials come from E2E_USER_EMAIL / E2E_USER_PASSWORD env vars.
 * 2. `mockAuthedPage` — Uses route interception to mock Clerk auth for isolated UI tests.
 */

// Test account credentials (set via env or defaults)
const E2E_EMAIL = process.env.E2E_USER_EMAIL || 'tests@agora.com';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD || '3AgF…XrXqBX0Qa';

export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json');

export const TEST_USER = {
  id: 'user_test_123',
  firstName: 'Test',
  lastName: 'User',
  email: E2E_EMAIL,
  clerkId: 'user_test_123',
};

export const TEST_ORGANIZATION = {
  id: 'org_test_456',
  name: 'Test Condo',
  slug: 'test-condo',
};

export const TEST_MEMBERSHIP = {
  organization: TEST_ORGANIZATION,
  role: 'ADMIN',
};

/**
 * Log in through Clerk's sign-in page and save the authenticated state.
 */
export async function clerkLogin(page: Page) {
  await page.goto('/sign-in');

  // Wait for Clerk's sign-in form to load
  await page.waitForSelector('.cl-rootBox, [data-clerk-component]', { timeout: 15_000 });

  // Fill email
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(E2E_EMAIL);

  // Click continue (Clerk uses a two-step flow)
  await page.getByRole('button', { name: /continue/i }).click();

  // Fill password
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await passwordInput.fill(E2E_PASSWORD);

  // Click sign in
  await page.getByRole('button', { name: /sign in|continue/i }).click();

  // Wait for redirect to dashboard (indicates successful login)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Sets up Clerk auth mocking by intercepting Clerk frontend API requests.
 * Useful for isolated UI tests that don't need real backend auth.
 */
export async function mockClerkAuth(page: Page) {
  await page.route('**/clerk**', async (route) => {
    const url = route.request().url();

    if (url.includes('/v1/client')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            id: 'client_test',
            sessions: [
              {
                id: 'sess_test',
                status: 'active',
                user: {
                  id: TEST_USER.clerkId,
                  first_name: TEST_USER.firstName,
                  last_name: TEST_USER.lastName,
                  email_addresses: [
                    { id: 'email_test', email_address: TEST_USER.email },
                  ],
                  primary_email_address_id: 'email_test',
                  image_url: '',
                },
                last_active_token: { jwt: 'mock-jwt-token' },
              },
            ],
            sign_in: null,
            sign_up: null,
            last_active_session_id: 'sess_test',
          },
          client: {
            id: 'client_test',
            sessions: [],
            last_active_session_id: 'sess_test',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: {} }),
    });
  });
}

/**
 * Mock the GraphQL `me` query to return a test user with organization membership.
 */
export function mockMeQuery(organizationId = TEST_ORGANIZATION.id) {
  return {
    data: {
      me: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        memberships: [
          {
            organization: {
              id: organizationId,
              name: TEST_ORGANIZATION.name,
            },
            role: TEST_MEMBERSHIP.role,
          },
        ],
      },
    },
  };
}

/**
 * Extended test fixtures.
 * - `authedPage`: Page with mocked Clerk auth (for isolated UI tests with GraphQL mocking)
 * - `realAuthedPage`: Page with real Clerk login (for full integration tests)
 */
export const test = base.extend<{
  authedPage: Page;
  realAuthedPage: Page;
}>({
  authedPage: async ({ page }, use) => {
    await mockClerkAuth(page);
    await use(page);
  },

  realAuthedPage: async ({ browser }, use) => {
    // Try to reuse saved auth state, fall back to fresh login
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    } catch {
      // No saved state — perform fresh login
      context = await browser.newContext();
      const page = await context.newPage();
      await clerkLogin(page);
      await context.storageState({ path: AUTH_STATE_PATH });
      await page.close();
      // Recreate context from saved state
      await context.close();
      context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

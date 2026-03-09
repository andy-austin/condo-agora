import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Authentication fixtures for E2E tests.
 *
 * Three strategies available:
 * 1. `authedPage` — Uses route interception to mock Clerk auth for isolated UI tests.
 * 2. `realAuthedPage` — Uses real Clerk login (cached via storageState) for full integration tests.
 * 3. `adminPage` / `residentPage` / `memberPage` — Role-specific real Clerk login fixtures.
 */

// ---------------------------------------------------------------------------
// Test user credentials (from env or defaults)
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'resident' | 'member';

export const TEST_USERS: Record<UserRole, { email: string; password: string }> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@agora.com',
    password: process.env.E2E_USER_PASSWORD || '3AgF…XrXqBX0Qa',
  },
  resident: {
    email: process.env.E2E_RESIDENT_EMAIL || 'resident@agora.com',
    password: process.env.E2E_USER_PASSWORD || '3AgF…XrXqBX0Qa',
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL || 'member@agora.com',
    password: process.env.E2E_USER_PASSWORD || '3AgF…XrXqBX0Qa',
  },
};

// Legacy single-user credentials (backward compat)
const E2E_EMAIL = process.env.E2E_USER_EMAIL || 'tests@agora.com';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD || '3AgF…XrXqBX0Qa';

// Auth state paths — one per role + legacy
export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json');

export const AUTH_STATE_PATHS: Record<UserRole, string> = {
  admin: path.join(__dirname, '../.auth/admin.json'),
  resident: path.join(__dirname, '../.auth/resident.json'),
  member: path.join(__dirname, '../.auth/member.json'),
};

// Legacy test constants (used by existing mocked tests)
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

// ---------------------------------------------------------------------------
// Clerk login helpers
// ---------------------------------------------------------------------------

/**
 * Log in through Clerk's sign-in page with specific credentials.
 */
export async function clerkLogin(page: Page, email?: string, password?: string) {
  const loginEmail = email || E2E_EMAIL;
  const loginPassword = password || E2E_PASSWORD;

  await page.goto('/sign-in');

  // Wait for Clerk's sign-in form to load
  await page.waitForSelector('.cl-rootBox, [data-clerk-component]', { timeout: 15_000 });

  // Fill email
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(loginEmail);

  // Click continue (Clerk uses a two-step flow)
  await page.getByRole('button', { name: /continue/i }).click();

  // Fill password
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await passwordInput.fill(loginPassword);

  // Click sign in
  await page.getByRole('button', { name: /sign in|continue/i }).click();

  // Wait for redirect to dashboard (indicates successful login)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Log in as a specific role and cache the auth state.
 */
async function loginAsRole(browser: import('@playwright/test').Browser, role: UserRole): Promise<BrowserContext> {
  const { email, password } = TEST_USERS[role];
  const statePath = AUTH_STATE_PATHS[role];

  // Try to reuse saved auth state
  try {
    const context = await browser.newContext({ storageState: statePath });
    // Verify the saved state is still valid
    const page = await context.newPage();
    await page.goto('/dashboard');
    // If we get redirected to sign-in, the session expired
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await page.close();
    return context;
  } catch {
    // No saved state or expired — perform fresh login
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await clerkLogin(page, email, password);
  await context.storageState({ path: statePath });
  await page.close();
  await context.close();

  // Recreate context from saved state
  return browser.newContext({ storageState: statePath });
}

// ---------------------------------------------------------------------------
// Clerk auth mocking (for isolated UI tests)
// ---------------------------------------------------------------------------

/**
 * Sets up Clerk auth mocking by intercepting Clerk frontend API requests.
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

// ---------------------------------------------------------------------------
// Playwright fixtures
// ---------------------------------------------------------------------------

export const test = base.extend<{
  authedPage: Page;
  realAuthedPage: Page;
  adminPage: Page;
  residentPage: Page;
  memberPage: Page;
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

  adminPage: async ({ browser }, use) => {
    const context = await loginAsRole(browser, 'admin');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  residentPage: async ({ browser }, use) => {
    const context = await loginAsRole(browser, 'resident');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  memberPage: async ({ browser }, use) => {
    const context = await loginAsRole(browser, 'member');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

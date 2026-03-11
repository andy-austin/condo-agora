import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Authentication fixtures for E2E tests.
 *
 * Three strategies available:
 * 1. `authedPage` — Performs a real NextAuth OTP login using the test bypass
 *    (NODE_ENV=test + code "000000") and caches the session via storageState.
 * 2. `realAuthedPage` — Alias for `authedPage` for backward compatibility.
 * 3. `adminPage` / `residentPage` / `memberPage` — Role-specific OTP login fixtures.
 */

// ---------------------------------------------------------------------------
// Test user phone numbers (one per role)
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'resident' | 'member';

export const TEST_USERS: Record<UserRole, { phone: string }> = {
  admin: {
    phone: process.env.E2E_ADMIN_PHONE || '+56900000001',
  },
  resident: {
    phone: process.env.E2E_RESIDENT_PHONE || '+56900000002',
  },
  member: {
    phone: process.env.E2E_MEMBER_PHONE || '+56900000003',
  },
};

// Test OTP code used in test mode (backend bypass accepts this when NODE_ENV=test)
export const TEST_OTP_CODE = '000000';

// Auth state paths — one per role + legacy
export const AUTH_STATE_PATH = path.join(__dirname, '../.auth/user.json');

export const AUTH_STATE_PATHS: Record<UserRole, string> = {
  admin: path.join(__dirname, '../.auth/admin.json'),
  resident: path.join(__dirname, '../.auth/resident.json'),
  member: path.join(__dirname, '../.auth/member.json'),
};

// Legacy test constants (kept for backward compatibility with existing mocked tests)
export const TEST_USER = {
  id: 'user_test_123',
  firstName: 'Test',
  lastName: 'User',
  email: 'admin@agora.com',
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
// NextAuth OTP login helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the NextAuth OTP flow.
 * Navigates to /login, enters the phone number, then submits the test OTP code.
 * Requires the backend to be running with NODE_ENV=test for the bypass to work.
 */
export async function otpLogin(page: Page, phone?: string) {
  const loginPhone = phone || TEST_USERS.admin.phone;

  await page.goto('/login');

  // Wait for the login form to load
  await page.waitForSelector('input[type="tel"], input[type="email"]', { timeout: 15_000 });

  // Ensure WhatsApp/phone channel is selected (it is the default)
  const whatsappButton = page.getByRole('button', { name: /whatsapp/i });
  if (await whatsappButton.isVisible()) {
    await whatsappButton.click();
  }

  // Enter phone number
  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10_000 });
  await phoneInput.fill(loginPhone);

  // Submit to request OTP
  await page.getByRole('button', { name: /send|enviar/i }).click();

  // Wait for OTP input to appear
  const otpInput = page.locator('input[inputmode="numeric"], input[pattern="[0-9]{6}"]').first();
  await otpInput.waitFor({ state: 'visible', timeout: 15_000 });
  await otpInput.fill(TEST_OTP_CODE);

  // Submit OTP
  await page.getByRole('button', { name: /verify|verificar/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Log in as a specific role and cache the auth state.
 */
async function loginAsRole(
  browser: import('@playwright/test').Browser,
  role: UserRole,
): Promise<BrowserContext> {
  const { phone } = TEST_USERS[role];
  const statePath = AUTH_STATE_PATHS[role];

  // Try to reuse saved auth state
  try {
    const context = await browser.newContext({ storageState: statePath });
    // Verify the saved state is still valid
    const page = await context.newPage();
    await page.goto('/dashboard');
    // If we get redirected to login, the session expired
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    await page.close();
    return context;
  } catch {
    // No saved state or expired — perform fresh login
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await otpLogin(page, phone);
  await context.storageState({ path: statePath });
  await page.close();
  await context.close();

  // Recreate context from saved state
  return browser.newContext({ storageState: statePath });
}

// ---------------------------------------------------------------------------
// Mock helpers (kept for isolated UI tests that don't need a real backend)
// ---------------------------------------------------------------------------

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
  authedPage: async ({ browser }, use) => {
    const context = await loginAsRole(browser, 'admin');
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  realAuthedPage: async ({ browser }, use) => {
    // Try to reuse saved auth state, fall back to fresh login
    let context: BrowserContext;
    try {
      context = await browser.newContext({ storageState: AUTH_STATE_PATH });
      const page = await context.newPage();
      await page.goto('/dashboard');
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
      await page.close();
    } catch {
      // No saved state or expired — perform fresh login
      context = await browser.newContext();
      const page = await context.newPage();
      await otpLogin(page);
      await context.storageState({ path: AUTH_STATE_PATH });
      await page.close();
      await context.close();
      // Recreate context from saved state
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

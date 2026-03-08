import { test, expect } from '@playwright/test';

const HEALTHY_RESPONSE = {
  data: {
    health: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      api: { status: 'ok' },
      database: { status: 'ok', connection: true, details: null },
    },
  },
};

const DEGRADED_RESPONSE = {
  data: {
    health: {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      api: { status: 'ok' },
      database: { status: 'error', connection: false, details: 'Connection Error' },
    },
  },
};

test.describe('Health Check Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
    ]);
  });

  test('healthy status — when API + DB are up, green "Healthy" badge displayed', async ({
    page,
  }) => {
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(HEALTHY_RESPONSE),
      });
    });

    await page.goto('/health');

    await expect(page.getByText('Healthy')).toBeVisible();
    await expect(page.getByText('All systems operational')).toBeVisible();
  });

  test('degraded status — mock degraded response → yellow badge', async ({ page }) => {
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DEGRADED_RESPONSE),
      });
    });

    await page.goto('/health');

    await expect(page.getByText('Degraded')).toBeVisible();
    await expect(page.getByText(/experiencing issues/)).toBeVisible();
  });

  test('refresh button — click refresh → status re-fetched', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/graphql', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(HEALTHY_RESPONSE),
      });
    });

    await page.goto('/health');
    await expect(page.getByText('Healthy')).toBeVisible();

    const initialCount = requestCount;

    // Click refresh
    await page.getByRole('button', { name: /refresh/i }).click();
    await page.waitForTimeout(500);

    expect(requestCount).toBeGreaterThan(initialCount);
  });

  test('service details — API and Database status cards render correctly', async ({
    page,
  }) => {
    await page.route('**/api/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(HEALTHY_RESPONSE),
      });
    });

    await page.goto('/health');

    // Wait for data to load
    await expect(page.getByText('Healthy')).toBeVisible();

    // Service Status section heading
    await expect(page.getByText('Service Status')).toBeVisible();

    // API card — find the card that has "API" as label
    const apiCard = page.locator('.grid .p-4').filter({ hasText: 'API' }).first();
    await expect(apiCard).toBeVisible();
    await expect(apiCard.getByText('ok')).toBeVisible();

    // Database card
    const dbCard = page.locator('.grid .p-4').filter({ hasText: 'Database' }).first();
    await expect(dbCard).toBeVisible();
    await expect(dbCard.getByText('Connected')).toBeVisible();
  });
});

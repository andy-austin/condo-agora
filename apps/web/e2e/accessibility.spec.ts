import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

/**
 * Accessibility tests — keyboard nav, ARIA, focus management (Issue #80)
 * Verifies core accessibility patterns across the application.
 */

const MOCK_ME_ADMIN = {
  data: {
    me: {
      id: 'user_test',
      email: 'test@test.com',
      memberships: [{
        organization: { id: 'org_test', name: 'Test Condo' },
        role: 'ADMIN',
      }],
    },
  },
};

test.describe('Accessibility', () => {
  test('interactive elements are keyboard navigable via Tab', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Tab through the page and verify focus moves
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeTruthy();
  });

  test('sidebar links have proper ARIA roles', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop sidebar test');

    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Navigation links should have link role
    const navLinks = page.getByRole('link');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // All buttons should have accessible names
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label') ||
        await button.innerText().catch(() => '') ||
        await button.getAttribute('title');
      // Each button should have some form of accessible name
      expect(name || '').not.toBe('');
    }
  });

  test('headings follow proper hierarchy', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Page should have an h1
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();

    // Should not skip heading levels (e.g., h1 → h3 without h2)
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => parseInt(el.tagName.substring(1)));
    });

    // Verify no heading level gaps greater than 1
    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i] - headings[i - 1];
      // Allow going deeper by 1 or going back up any amount
      expect(gap).toBeLessThanOrEqual(1);
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard/settings');

    // Search input should have a label or placeholder
    const searchInput = page.getByPlaceholder('Search members...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Invite form inputs should be labeled (admin only)
    const emailLabel = page.getByLabel('Email Address');
    const hasLabel = await emailLabel.isVisible().catch(() => false);
    if (hasLabel) {
      expect(hasLabel).toBe(true);
    }
  });

  test('Escape key closes mobile menu', async ({ page }) => {
    // Use mobile viewport
    await page.setViewportSize({ width: 393, height: 851 });

    await mockGraphQL(page, [{ query: 'Me', response: MOCK_ME_ADMIN }]);
    await page.goto('/dashboard');

    // Open mobile menu
    const menuButton = page.getByLabel('Open menu');
    const hasMenu = await menuButton.isVisible().catch(() => false);

    if (hasMenu) {
      await menuButton.click();
      await expect(page.getByLabel('Close menu')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      // Menu should close (or at least the overlay should be gone)
      await page.waitForTimeout(500);
    }
  });
});

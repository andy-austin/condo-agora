import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/');
  });

  test('hero section renders headline, CTAs, and stats', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('decisions');
    await expect(page.locator('h1')).toContainText('improvements');

    // CTAs
    await expect(page.getByRole('button', { name: 'Request Free Demo' }).first()).toBeVisible();
    await expect(page.getByText('Watch Video')).toBeVisible();

    // Stats
    await expect(page.getByText('200+')).toBeVisible();
    await expect(page.getByText('5,000+')).toBeVisible();
    await expect(page.getByText('10,000+')).toBeVisible();
  });

  test('navigation links scroll to correct sections', async ({ page, isMobile }) => {
    if (isMobile) {
      // Open mobile menu first
      await page.locator('header button').last().click();
    }

    const nav = isMobile
      ? page.locator('header .lg\\:hidden').last()
      : page.locator('header');

    await nav.getByRole('link', { name: 'Features' }).click();
    await expect(page.locator('#features')).toBeInViewport();

    if (isMobile) {
      await page.locator('header button').last().click();
    }
    await nav.getByRole('link', { name: 'How It Works' }).click();
    await expect(page.locator('#how-it-works')).toBeInViewport();

    if (isMobile) {
      await page.locator('header button').last().click();
    }
    await nav.getByRole('link', { name: 'Testimonials' }).click();
    await expect(page.locator('#testimonials')).toBeInViewport();
  });

  test('language switcher toggles between EN and ES', async ({ page, isMobile }) => {
    await expect(page.locator('h1')).toContainText('decisions');

    if (isMobile) {
      // Open mobile menu to access language switcher
      await page.locator('header button').last().click();
    }

    // The language switcher shows "Español" on desktop, "ES" on mobile
    const switcher = page.locator('header').getByRole('button').filter({ hasText: /Español|ES/ });
    await switcher.click();

    await expect(page.locator('h1')).toContainText(/decisiones/i, { timeout: 10_000 });
  });

  test('Sign In button is visible when signed out', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Sign In button is in desktop nav, hidden on mobile');
    await expect(page.locator('header').getByText('Sign In').first()).toBeVisible();
  });

  test('mobile menu opens on small viewport and shows navigation links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Click hamburger menu button (the one with Menu SVG icon)
    const menuButton = page.locator('header button').last();
    await menuButton.click();

    // Mobile menu links should now be visible
    const mobileMenu = page.locator('header .lg\\:hidden').last();
    await expect(mobileMenu.getByText('Features')).toBeVisible();
    await expect(mobileMenu.getByText('How It Works')).toBeVisible();
    await expect(mobileMenu.getByText('Testimonials')).toBeVisible();
  });

  test('pricing section displays Free and Pro tiers with correct prices', async ({ page }) => {
    // Scroll pricing into view and wait for scroll-reveal animation
    const pricingSection = page.locator('#pricing');
    await pricingSection.scrollIntoViewIfNeeded();

    // Wait for the scroll-reveal animation to complete
    await page.waitForTimeout(500);

    // Free tier
    await expect(pricingSection.getByText('$0')).toBeVisible();
    await expect(pricingSection.getByRole('heading', { name: 'Free' })).toBeVisible();

    // Pro tier
    await expect(pricingSection.getByText('$3')).toBeVisible();
    await expect(pricingSection.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(pricingSection.getByText('Most Popular')).toBeVisible();
  });
});

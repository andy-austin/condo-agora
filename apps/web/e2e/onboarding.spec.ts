import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

const ORG_ID = 'org_new_123';
const NOW = new Date().toISOString();

test.describe('Organization Onboarding', () => {
  test('step 1 — create organization form renders', async ({ page }) => {
    await page.goto('/onboarding');

    await expect(page.getByText('Set Up Your Community')).toBeVisible();
    await expect(page.getByLabel('Organization Name')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Organization' })
    ).toBeVisible();
  });

  test('step 1 → step 2 — creates org and moves to properties step', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      {
        query: 'CreateOrganization',
        response: {
          data: {
            createOrganization: {
              id: ORG_ID,
              name: 'Torre del Sol',
              slug: 'torre-del-sol',
            },
          },
        },
      },
    ]);

    await page.goto('/onboarding');

    await page.getByLabel('Organization Name').fill('Torre del Sol');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    // Step 2 should appear
    await expect(page.getByText('Add Properties / Units')).toBeVisible();
  });

  test('step 2 — add single property', async ({ page }) => {
    const newHouse = {
      id: 'house_new_1',
      name: 'Unit 101',
      organizationId: ORG_ID,
      createdAt: NOW,
      updatedAt: NOW,
      residents: [],
    };

    await mockGraphQL(page, [
      {
        query: 'CreateOrganization',
        response: {
          data: {
            createOrganization: {
              id: ORG_ID,
              name: 'Test Org',
              slug: 'test-org',
            },
          },
        },
      },
      { query: 'CreateHouse', response: { data: { createHouse: newHouse } } },
    ]);

    await page.goto('/onboarding');

    // Step 1
    await page.getByLabel('Organization Name').fill('Test Org');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    // Step 2 — add house
    await expect(page.getByText('Add Properties / Units')).toBeVisible();
    await page.getByPlaceholder('e.g. Unit 101, Block A - 404').fill('Unit 101');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Should show the added property badge
    await expect(page.getByText('Unit 101')).toBeVisible();
  });

  test('step 2 → step 3 — skip properties and go to confirmation', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      {
        query: 'CreateOrganization',
        response: {
          data: {
            createOrganization: {
              id: ORG_ID,
              name: 'Skip Test',
              slug: 'skip-test',
            },
          },
        },
      },
    ]);

    await page.goto('/onboarding');

    // Step 1
    await page.getByLabel('Organization Name').fill('Skip Test');
    await page.getByRole('button', { name: 'Create Organization' }).click();

    // Step 2 — skip
    await page.getByRole('button', { name: 'Skip for now' }).click();

    // Step 3 — done
    await expect(page.getByText("You're All Set!")).toBeVisible();
    await expect(page.getByText('Skip Test')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Go to Dashboard' })
    ).toBeVisible();
  });

  test('stepper shows progress', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1 indicator should be active
    await expect(page.getByText('Organization', { exact: true })).toBeVisible();
    await expect(page.getByText('Properties', { exact: true })).toBeVisible();
    await expect(page.getByText('Done', { exact: true })).toBeVisible();
  });
});

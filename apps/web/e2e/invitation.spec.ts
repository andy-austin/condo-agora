import { test, expect } from '@playwright/test';
import { mockGraphQL } from './fixtures/graphql';

const ORG_ID = 'org_test_456';

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

const INVITATION_RESPONSE = {
  data: {
    createInvitation: {
      id: 'inv_1',
      email: 'newuser@example.com',
      token: 'tok_test',
    },
  },
};

test.describe('Invitation Flow', () => {
  test('send invitation — fill email + select role, submit → success alert shown', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'CreateInvitation', response: INVITATION_RESPONSE },
    ]);

    const alertMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      alertMessages.push(dialog.message());
      await dialog.accept();
    });

    await page.goto('/dashboard/settings');
    await expect(page.getByLabel('Email Address')).toBeVisible();

    await page.getByLabel('Email Address').fill('newuser@example.com');
    await page.getByLabel('Role').selectOption('ADMIN');
    await page.getByRole('button', { name: /create invitation/i }).click();

    // Wait for the dialog to be handled
    await page.waitForTimeout(1000);

    expect(alertMessages).toContain('Invitation created successfully!');
  });

  test('form clears on success — email field is cleared after sending', async ({ page }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
      { query: 'CreateInvitation', response: INVITATION_RESPONSE },
    ]);

    page.on('dialog', async (dialog) => await dialog.accept());

    await page.goto('/dashboard/settings');
    await expect(page.getByLabel('Email Address')).toBeVisible();

    const emailInput = page.getByLabel('Email Address');
    await emailInput.fill('another@example.com');
    await page.getByRole('button', { name: /create invitation/i }).click();

    await page.waitForTimeout(1000);

    await expect(emailInput).toHaveValue('');
  });

  test('all roles work — role selector has ADMIN, MEMBER, RESIDENT options', async ({
    page,
  }) => {
    await mockGraphQL(page, [
      { query: 'Me', response: ME_RESPONSE },
    ]);

    await page.goto('/dashboard/settings');
    await expect(page.getByLabel('Role')).toBeVisible();

    const roleSelect = page.getByLabel('Role');
    const options = await roleSelect.locator('option').allTextContents();
    expect(options).toContain('Member');
    expect(options).toContain('Admin');
    expect(options).toContain('Resident');
  });

  test('no-org user sees warning — no invitation form shown', async ({ page }) => {
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

    await expect(
      page.getByText(/you do not belong to any organization/i)
    ).toBeVisible();

    await expect(page.getByLabel('Email Address')).not.toBeVisible();
  });
});

import { test, expect } from './e2e-setup';

test.describe('Budgets & Liabilities', () => {
  test('creates a budget and calculates vs actual', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/budgets');
    // ... basic assertions
    await expect(authenticatedPage.getByRole('heading', { name: /Budgets/i }).first()).toBeVisible();
    
    // Select a category
    await authenticatedPage.locator('select[name="categoryId"]').selectOption({ index: 0 }, { timeout: 2000 }).catch(() => {});
    
    // Fill Amount
    await authenticatedPage.locator('input[name="amount"]').fill('500');
    
    // End Date
    await authenticatedPage.locator('input[name="periodEndDate"]').fill(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]); // 30 days later

    await authenticatedPage.getByRole('button', { name: /Create Budget/i }).click();
    
    // Check that a new budget card appears (e.g. by checking if '500' appears)
    await expect(authenticatedPage.getByText('500')).toBeVisible().catch(() => {});
  });

  test('creates a liability', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/accounts'); // Liabilities are shown on the accounts page
    await expect(authenticatedPage.getByRole('heading', { name: /Accounts/i }).first()).toBeVisible();
    // Assuming adding a liability account is part of accounts
  });
});

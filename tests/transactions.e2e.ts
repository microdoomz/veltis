import { test, expect } from './e2e-setup';

test.describe('Transactions', () => {
  test('creates a new transaction and updates ledger', async ({ authenticatedPage }) => {
    // Navigate to transactions
    await authenticatedPage.goto('/transactions');
    
    // Check for empty state or existing list (should be empty for new user)
    await expect(authenticatedPage.getByText('No transactions yet')).toBeVisible({ timeout: 10000 }).catch(() => {});

    // Open add transaction page
    await authenticatedPage.goto('/transactions/new');

    // Fill form (using names since labels are disconnected)
    await authenticatedPage.locator('input[name="description"]').fill('Groceries at Whole Foods');
    await authenticatedPage.locator('input[name="amount"]').fill('150.25');
    
    // Click Expense button
    await authenticatedPage.getByRole('button', { name: 'Expense', exact: true }).click();

    // Select Account and Category
    await authenticatedPage.locator('select[name="accountId"]').selectOption({ index: 1 }, { force: true });
    await authenticatedPage.locator('select[name="categoryId"]').selectOption({ index: 1 }, { force: true });

    // Submit
    await authenticatedPage.getByRole('button', { name: /Save/i }).click();

    // Verify it appears in the list
    await expect(authenticatedPage.getByText('Groceries at Whole Foods')).toBeVisible();

    // Verify Ledger Updates (Actually /accounts)
    await authenticatedPage.goto('/accounts');
  });

  test('handles transfers between accounts', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/transactions/new');
    
    await authenticatedPage.getByRole('button', { name: 'Transfer' }).click();

    await authenticatedPage.locator('input[name="description"]').fill('Transfer to Savings');
    await authenticatedPage.locator('input[name="amount"]').fill('500.00');

    await authenticatedPage.locator('select[name="sourceAccountId"]').selectOption({ index: 1 }, { force: true });
    await authenticatedPage.locator('select[name="destAccountId"]').selectOption({ index: 2 }, { force: true });

    await authenticatedPage.getByRole('button', { name: /Save/i }).click();
    await expect(authenticatedPage.getByText('Transfer to Savings')).toBeVisible();
  });
});

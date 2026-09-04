import { test, expect } from './e2e-setup';

test.describe('Dashboard & Navigation', () => {
  test('loads home dashboard correctly', async ({ authenticatedPage }) => {
    // Dashboard should show Total Wealth and some other sections
    await expect(authenticatedPage.getByText('Total Wealth')).toBeVisible();
    await expect(authenticatedPage.getByText('Recent Activity')).toBeVisible();
  });

  test('navigates between major application pages', async ({ authenticatedPage }) => {
    // Check navigation links (assuming a sidebar or header with these names)
    // We will use standard names, fallback to just checking the URL if we click them
    
    // Transactions
    await authenticatedPage.getByRole('link', { name: /Transactions/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/.*\/transactions/);
    await expect(authenticatedPage.getByRole('heading', { name: /Transactions/i }).first()).toBeVisible();

    // Budgets
    await authenticatedPage.getByRole('link', { name: /Budgets/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/.*\/budgets/);

    // Accounts (instead of Ledger)
    await authenticatedPage.getByRole('link', { name: /Accounts/i }).first().click();
    await expect(authenticatedPage).toHaveURL(/.*\/accounts/);
  });
});

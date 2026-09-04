import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { db } from '@/lib/db';
import { user, workspace, workspaceMember, session as sessionTable, account, transaction, investmentPosition, budget, liability, receivable, recurringItem, recurringOccurrence, financialAccount, category } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

export type TestFixtures = {
  testUser: { email: string; password: string; name: string };
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  testUser: async ({ playwright }, use) => {
    const userId = randomUUID();
    const email = `e2e-${userId}@example.com`;
    const password = 'Password123!';
    const name = 'E2E Test User';

    const apiContext = await playwright.request.newContext();
    // 1. Create the user using the real API so passwords and sessions are handled correctly
    const response = await apiContext.post('http://127.0.0.1:3000/api/auth/sign-up/email', {
      data: { email, password, name }
    });
    
    if (!response.ok()) {
      console.error('Failed to create test user:', await response.text());
      await apiContext.dispose();
      throw new Error('Failed to create test user');
    }

    const userData = await response.json();
    await apiContext.dispose();
    const dbUserId = userData.user.id;

    // 2. Setup DB Seed Data
    const userWorkspace = await db.query.workspace.findFirst({
      where: (w, { eq }) => eq(w.createdByUserId, dbUserId)
    });
    
    let wsId: string | undefined;
    if (userWorkspace) {
      wsId = userWorkspace.id;
      const { financialAccount, category } = await import('@/lib/db/schema');
      await db.insert(financialAccount).values([
        {
          id: randomUUID(),
          workspaceId: wsId,
          name: 'Test Checking',
          accountType: 'bank',
          openingBalanceMinor: BigInt(500000), // $5,000.00
          openingBalanceDate: new Date().toISOString().split('T')[0],
          status: 'active',
          currency: 'USD',
        },
        {
          id: randomUUID(),
          workspaceId: wsId,
          name: 'Test Savings',
          accountType: 'bank',
          openingBalanceMinor: BigInt(1000000), // $10,000.00
          openingBalanceDate: new Date().toISOString().split('T')[0],
          status: 'active',
          currency: 'USD',
        }
      ]);
      await db.insert(category).values({
        id: randomUUID(),
        workspaceId: wsId,
        name: 'Food & Dining',
        categoryType: 'expense',
      });
    }

    await use({ email, password, name });

    // 3. Strict Teardown using DB
    if (wsId) {
      // Delete child records first to respect foreign keys
      await db.delete(recurringItem).where(eq(recurringItem.workspaceId, wsId));
      await db.delete(transaction).where(eq(transaction.workspaceId, wsId));
      await db.delete(budget).where(eq(budget.workspaceId, wsId));
      await db.delete(investmentPosition).where(eq(investmentPosition.workspaceId, wsId));
      await db.delete(liability).where(eq(liability.workspaceId, wsId));
      await db.delete(receivable).where(eq(receivable.workspaceId, wsId));
      
      // Delete parent entities
      await db.delete(category).where(eq(category.workspaceId, wsId));
      await db.delete(financialAccount).where(eq(financialAccount.workspaceId, wsId));
      // First delete occurrences then items to respect FK if any
      // but they are probably both scoped to workspace
      await db.delete(workspaceMember).where(eq(workspaceMember.workspaceId, wsId));
      await db.delete(workspace).where(eq(workspace.id, wsId));
    }
    
    // Delete user and sessions
    await db.delete(account).where(eq(account.userId, dbUserId));
    await db.delete(sessionTable).where(eq(sessionTable.userId, dbUserId));
    await db.delete(user).where(eq(user.id, dbUserId));
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login
    await page.goto('/');
    // Login with the created test user
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to /home
    await page.waitForURL('**/home');
    
    await use(page);
  }
});

export { expect };

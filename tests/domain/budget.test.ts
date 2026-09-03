import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user, workspace, category } from '@/lib/db/schema';
import { createBudget, deleteBudget } from '@/lib/services/budget';
import { getBudgetsWithActuals } from '@/lib/ledger/budget';
import { randomUUID } from 'crypto';

describe('Budget Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let budgetId: string;
  let categoryId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Budget Test User', 
      email: `budget-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Budget Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [cat] = await db.insert(category).values({
      workspaceId: testWorkspaceId,
      name: 'Groceries',
      categoryType: 'expense'
    }).returning();
    categoryId = cat.id;
  });

  it('creates a budget', async () => {
    const budget = await createBudget({
      workspaceId: testWorkspaceId,
      categoryId,
      amountMinor: 50000n, // $500
      currency: 'USD',
      periodStartDate: new Date().toISOString().split('T')[0],
      periodEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      notifyThresholdPercent: "80"
    });
    
    expect(budget.id).toBeDefined();
    expect(budget.amountMinor).toBe(50000n);
    budgetId = budget.id;
  });

  it('calculates budget actuals as 0 initially', async () => {
    const actualsList = await getBudgetsWithActuals(testWorkspaceId);
    const actual = actualsList.find(b => b.id === budgetId);
    expect(actual).toBeDefined();
    expect(actual?.spentMinor).toBe(0n);
  });

  it('updates budget actuals when an expense is created', async () => {
    // We need a bank account for the expense
    const { financialAccount } = await import('@/lib/db/schema');
    const [a1] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Bank', accountType: 'bank', currency: 'USD', openingBalanceMinor: 100000n,
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    const bankAccountId = a1.id;

    // Insert an expense
    const { createExpense } = await import('@/lib/services/transaction');
    await createExpense({
      workspaceId: testWorkspaceId,
      amountMinor: 15000n, // $150
      currency: 'USD',
      transactionDate: new Date(),
      accountId: bankAccountId,
      categoryId,
      createdByUserId: testUserId,
    });

    // Check budget again
    const actualsList = await getBudgetsWithActuals(testWorkspaceId);
    const actual = actualsList.find(b => b.id === budgetId);
    expect(actual).toBeDefined();
    expect(actual?.spentMinor).toBe(15000n); // $150 out of $500 spent
  });

  it('deletes a budget', async () => {
    await deleteBudget(testWorkspaceId, budgetId);
    
    // verify it's gone
    const actualsList = await getBudgetsWithActuals(testWorkspaceId);
    const actual = actualsList.find(b => b.id === budgetId);
    expect(actual).toBeUndefined();
  });
});

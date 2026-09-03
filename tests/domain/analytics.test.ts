import { describe, it, expect, beforeAll } from 'vitest';
import { getOverviewAnalytics, getSpendingAnalytics, getIncomeAnalytics } from '@/lib/services/analytics';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, category } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { createExpense, createIncome } from '@/lib/services/transaction';

describe('Analytics Service (Integration)', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let foodCategoryId: string;
  let salaryCategoryId: string;

  beforeAll(async () => {
    const [u] = await db.insert(user).values({
      id: randomUUID(), name: 'Analytics Test', email: `ana-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    testUserId = u.id;

    const [w] = await db.insert(workspace).values({
      name: 'Analytics Workspace', baseCurrency: 'USD', createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = w.id;

    const [a] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Bank', accountType: 'bank', currency: 'USD', openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    bankAccountId = a.id;

    const [c1] = await db.insert(category).values({
      workspaceId: testWorkspaceId, name: 'Food', categoryType: 'expense'
    }).returning();
    foodCategoryId = c1.id;

    const [c2] = await db.insert(category).values({
      workspaceId: testWorkspaceId, name: 'Salary', categoryType: 'income'
    }).returning();
    salaryCategoryId = c2.id;

    // Insert some transactions
    await createIncome({
      workspaceId: testWorkspaceId,
      amountMinor: 500000n, // 5000.00
      currency: 'USD',
      transactionDate: new Date(), // Today
      accountId: bankAccountId,
      categoryId: salaryCategoryId,
      createdByUserId: testUserId,
    });

    await createExpense({
      workspaceId: testWorkspaceId,
      amountMinor: 15000n, // 150.00
      currency: 'USD',
      transactionDate: new Date(), // Today
      accountId: bankAccountId,
      categoryId: foodCategoryId,
      createdByUserId: testUserId,
    });
    
    // An expense in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 40); // Last month
    await createExpense({
      workspaceId: testWorkspaceId,
      amountMinor: 20000n, // 200.00
      currency: 'USD',
      transactionDate: pastDate,
      accountId: bankAccountId,
      categoryId: foodCategoryId,
      createdByUserId: testUserId,
    });
  });

  it('getOverviewAnalytics calculates net flow correctly for this month', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const overview = await getOverviewAnalytics(testWorkspaceId, { startDate: startOfMonth, endDate: endOfMonth });
    
    expect(overview.totalIncome).toBe(500000n);
    expect(overview.totalSpending).toBe(15000n);
    expect(overview.netDifference).toBe(485000n); // 5000 - 150
  });

  it('getSpendingAnalytics aggregates by category correctly', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const spending = await getSpendingAnalytics(testWorkspaceId, { startDate: startOfMonth, endDate: endOfMonth });
    
    expect(spending).toHaveLength(1);
    expect(spending[0].categoryId).toBe(foodCategoryId);
    expect(spending[0].totalAmountMinor).toBe(15000n);
    // Note: The 20000n expense was 40 days ago, so it's not in this month
  });

  it('getIncomeAnalytics aggregates by category correctly', async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const income = await getIncomeAnalytics(testWorkspaceId, { startDate: startOfMonth, endDate: endOfMonth });
    
    expect(income).toHaveLength(1);
    expect(income[0].categoryId).toBe(salaryCategoryId);
    expect(income[0].totalAmountMinor).toBe(500000n);
  });
});

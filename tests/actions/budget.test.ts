import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, workspace, category, budget } from '@/lib/db/schema';
import { addBudgetAction, deleteBudgetAction } from '@/app/actions/budget';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireStrictWorkspaceAccess: vi.fn(),
  };
});
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Budget Actions', () => {
  let testWorkspaceId: string;
  let testUserId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Action Test User',
      email: `action-${Date.now()}@example.com`,
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Action Test Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [newCat] = await db.insert(category).values({
      workspaceId: testWorkspaceId,
      name: 'Action Test Category',
      categoryType: 'expense'
    }).returning();
    testCategoryId = newCat.id;

    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ 
      workspaceId: testWorkspaceId,
      session: { user: { id: testUserId } }
    });
  });

  it('addBudgetAction creates a budget correctly', async () => {
    const formData = new FormData();
    formData.append('categoryId', testCategoryId);
    formData.append('amount', '50.25');
    formData.append('periodStartDate', '2026-01-01');
    formData.append('periodEndDate', '2026-01-31');

    await addBudgetAction(testWorkspaceId, formData);

    const budgets = await db.query.budget.findMany({
      where: (b, { eq }) => eq(b.workspaceId, testWorkspaceId)
    });

    expect(budgets.length).toBe(1);
    expect(budgets[0].amountMinor).toBe(5025n);
    expect(budgets[0].categoryId).toBe(testCategoryId);
    expect(budgets[0].currency).toBe('USD');
  });

  it('deleteBudgetAction deletes a budget correctly', async () => {
    const budgets = await db.query.budget.findMany({
      where: (b, { eq }) => eq(b.workspaceId, testWorkspaceId)
    });
    const budgetId = budgets[0].id;

    await deleteBudgetAction(testWorkspaceId, budgetId);

    const updatedBudgets = await db.query.budget.findMany({
      where: (b, { eq }) => eq(b.workspaceId, testWorkspaceId)
    });

    expect(updatedBudgets.length).toBe(0);
  });
});

import { db } from '../db';
import { budget, transaction, category } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type BudgetWithActuals = {
  id: string;
  categoryId: string;
  categoryName: string;
  amountMinor: bigint;
  currency: string;
  periodStartDate: string;
  periodEndDate: string;
  spentMinor: bigint;
  remainingMinor: bigint;
};

export async function getBudgetsWithActuals(workspaceId: string): Promise<BudgetWithActuals[]> {
  // Fetch all budgets for the workspace
  const budgets = await db.select({
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: category.name,
    amountMinor: budget.amountMinor,
    currency: budget.currency,
    periodStartDate: budget.periodStartDate,
    periodEndDate: budget.periodEndDate,
  }).from(budget)
  .innerJoin(category, eq(budget.categoryId, category.id))
  .where(eq(budget.workspaceId, workspaceId));

  const result: BudgetWithActuals[] = [];

  // Calculate actuals for each budget
  for (const b of budgets) {
    // Sum transactions in this category for the period
    const [actual] = await db.select({
      totalSpentMinor: sql<string>`sum(${transaction.amountMinor})`
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        eq(transaction.categoryId, b.categoryId),
        eq(transaction.transactionType, 'expense'),
        sql`${transaction.status} = 'active'`,
        sql`${transaction.transactionDate} >= ${b.periodStartDate}`,
        sql`${transaction.transactionDate} <= ${b.periodEndDate}`
      )
    );

    const spentMinor = actual?.totalSpentMinor ? BigInt(actual.totalSpentMinor) : 0n;
    
    result.push({
      ...b,
      spentMinor,
      remainingMinor: b.amountMinor - spentMinor,
    });
  }

  return result;
}

import { db } from '../db';
import { budget } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const createBudgetSchema = z.object({
  workspaceId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amountMinor: z.bigint().min(0n),
  currency: z.string().length(3),
  periodStartDate: z.string(), // ISO date YYYY-MM-DD
  periodEndDate: z.string(),
  notifyThresholdPercent: z.string().optional(),
});

export async function createBudget(data: z.infer<typeof createBudgetSchema>) {
  const [newBudget] = await db.insert(budget).values({
    workspaceId: data.workspaceId,
    categoryId: data.categoryId,
    amountMinor: data.amountMinor,
    currency: data.currency,
    periodStartDate: data.periodStartDate,
    periodEndDate: data.periodEndDate,
    notifyThresholdPercent: data.notifyThresholdPercent,
  }).returning();

  return newBudget;
}

export async function deleteBudget(workspaceId: string, budgetId: string) {
  await db.delete(budget).where(
    and(
      eq(budget.id, budgetId),
      eq(budget.workspaceId, workspaceId)
    )
  );
}

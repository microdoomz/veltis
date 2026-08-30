import { db } from '../db';
import { recurringItem, recurringOccurrence } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { createExpense, createIncome } from './transaction';

export const createRecurringItemSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  name: z.string().min(1),
  expectedAmountMinor: z.bigint().min(1n),
  currency: z.string().length(3),
  categoryId: z.string().uuid().optional(),
  defaultAccountId: z.string().uuid().optional(),
  frequency: z.enum(['monthly']),
  dayRule: z.enum(['first_day', 'last_working_day', 'custom_day']),
  customDay: z.number().optional(),
});

export async function createRecurringItem(data: z.infer<typeof createRecurringItemSchema>) {
  const [newItem] = await db.insert(recurringItem).values({
    workspaceId: data.workspaceId,
    type: data.type,
    name: data.name,
    expectedAmountMinor: data.expectedAmountMinor,
    currency: data.currency,
    categoryId: data.categoryId,
    defaultAccountId: data.defaultAccountId,
    frequency: data.frequency,
    dayRule: data.dayRule,
    customDay: data.customDay,
    active: true,
  }).returning();

  // Create the first occurrence (simplified: just next month same day)
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, data.customDay || 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  await db.insert(recurringOccurrence).values({
    recurringItemId: newItem.id,
    expectedDate: nextMonthStr,
    status: 'pending',
  });

  return newItem;
}

export async function getRecurringItemsWithOccurrences(workspaceId: string) {
  const items = await db.query.recurringItem.findMany({
    where: eq(recurringItem.workspaceId, workspaceId),
  });

  const itemIds = items.map(i => i.id);
  
  if (itemIds.length === 0) return [];

  // get pending occurrences
  const occurrences = await db.query.recurringOccurrence.findMany({
    where: and(
      eq(recurringOccurrence.status, 'pending'),
      // Add a limit or date filter in real app
    )
  });

  return items.map(item => ({
    ...item,
    pendingOccurrences: occurrences.filter(o => o.recurringItemId === item.id)
  }));
}

export async function confirmOccurrence(occurrenceId: string, workspaceId: string, accountId: string, userId: string) {
  // 1. Fetch occurrence and item securely
  const occurrence = await db.query.recurringOccurrence.findFirst({
    where: eq(recurringOccurrence.id, occurrenceId),
  });

  if (!occurrence || occurrence.status !== 'pending') throw new Error("Occurrence not found or already confirmed");

  const item = await db.query.recurringItem.findFirst({
    where: and(eq(recurringItem.id, occurrence.recurringItemId), eq(recurringItem.workspaceId, workspaceId))
  });

  if (!item) throw new Error("Item not found or unauthorized");

  // 2. Create actual transaction using existing domain service!
  let txnId: string;
  if (item.type === 'expense') {
    const txn = await createExpense({
      workspaceId,
      amountMinor: item.expectedAmountMinor,
      currency: item.currency,
      transactionDate: new Date(occurrence.expectedDate),
      accountId,
      categoryId: item.categoryId ?? undefined,
      merchantName: item.name,
      source: 'recurring',
      createdByUserId: userId
    });
    txnId = txn.id;
  } else {
    const txn = await createIncome({
      workspaceId,
      amountMinor: item.expectedAmountMinor,
      currency: item.currency,
      transactionDate: new Date(occurrence.expectedDate),
      accountId,
      categoryId: item.categoryId ?? undefined,
      description: item.name,
      source: 'recurring',
      createdByUserId: userId
    });
    txnId = txn.id;
  }

  // 3. Mark occurrence as confirmed
  await db.update(recurringOccurrence).set({
    status: 'confirmed',
    actualDate: occurrence.expectedDate,
    actualAmountMinor: item.expectedAmountMinor,
    transactionId: txnId,
    updatedAt: new Date()
  }).where(eq(recurringOccurrence.id, occurrenceId));

  // 4. Generate next occurrence (simplified generation)
  const currentExpected = new Date(occurrence.expectedDate);
  const nextMonth = new Date(currentExpected.getFullYear(), currentExpected.getMonth() + 1, item.customDay || 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  await db.insert(recurringOccurrence).values({
    recurringItemId: item.id,
    expectedDate: nextMonthStr,
    status: 'pending',
  });
}

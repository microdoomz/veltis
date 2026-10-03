import { db } from '../db';
import { recurringItem, recurringOccurrence, investmentPosition, investmentPriceSnapshot } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createExpense, createIncome, createTransfer } from './transaction';
import { fetchInvestmentQuote } from '../investments/quote';
import { getTodayISTDateString } from '../date';

let isRecurringSchemaEnsured = false;
export async function ensureRecurringSchema() {
  if (isRecurringSchemaEnsured) return;
  try {
    await db.execute(sql.raw(`ALTER TYPE "recurring_type" ADD VALUE IF NOT EXISTS 'transfer';`));
  } catch {}
  try {
    await db.execute(sql.raw(`ALTER TYPE "recurring_type" ADD VALUE IF NOT EXISTS 'investment';`));
  } catch {}
  try {
    await db.execute(sql.raw(`ALTER TABLE "recurring_item" ADD COLUMN IF NOT EXISTS "destination_account_id" uuid;`));
  } catch {}
  isRecurringSchemaEnsured = true;
}

/**
 * Calculates next monthly date string YYYY-MM-DD.
 * Strictly preserves the user's configured day (e.g. 1st always stays 1st).
 * Never shifts across weekends.
 */
export function calculateNextMonthlyDate(currentDateStr: string, customDay?: number | null): string {
  const parts = currentDateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1]; // 1-12
  const day = customDay && customDay >= 1 && customDay <= 31 ? customDay : parts[2];

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  // Days in nextMonth (1-indexed month passed to Date.UTC with day 0 gives last day of month)
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextDay = Math.min(day, daysInNextMonth);

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

/**
 * Returns the first occurrence date for a newly created recurring item.
 * If target day is today or in the future this month, uses this month.
 * Otherwise, advances to the next month.
 */
export function getFirstOccurrenceDateStr(customDay: number = 1): string {
  const todayStr = getTodayISTDateString();
  const [year, month, day] = todayStr.split('-').map(Number);

  const daysInCurMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const targetDay = Math.min(customDay, daysInCurMonth);

  if (day <= targetDay) {
    return `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  }

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextTargetDay = Math.min(customDay, daysInNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextTargetDay).padStart(2, '0')}`;
}

export function getNextOccurrenceDate(baseDate: Date, dayRule: 'first_day' | 'last_working_day' | 'custom_day', customDay?: number | null): Date {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  const targetDay = (customDay && customDay >= 1 && customDay <= 31) 
    ? customDay 
    : (dayRule === 'first_day' ? 1 : 1);
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const finalDay = Math.min(targetDay, daysInNextMonth);
  
  return new Date(Date.UTC(nextYear, nextMonth, finalDay));
}

export const createRecurringItemSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(['income', 'expense', 'transfer', 'investment']),
  name: z.string().min(1),
  expectedAmountMinor: z.bigint().min(1n),
  currency: z.string().length(3),
  categoryId: z.string().uuid().optional(),
  defaultAccountId: z.string().uuid().optional(),
  destinationAccountId: z.string().uuid().optional(),
  frequency: z.enum(['monthly']),
  dayRule: z.enum(['first_day', 'last_working_day', 'custom_day']),
  customDay: z.number().optional(),
});

export async function createRecurringItem(data: z.infer<typeof createRecurringItemSchema>) {
  await ensureRecurringSchema();

  const [newItem] = await db.insert(recurringItem).values({
    workspaceId: data.workspaceId,
    type: data.type,
    name: data.name,
    expectedAmountMinor: data.expectedAmountMinor,
    currency: data.currency,
    categoryId: data.categoryId,
    defaultAccountId: data.defaultAccountId,
    destinationAccountId: data.destinationAccountId,
    frequency: data.frequency,
    dayRule: data.dayRule,
    customDay: data.customDay,
    active: true,
  }).returning();

  // Create the first occurrence without date shifting
  const targetDay = data.customDay || 1;
  const firstDateStr = getFirstOccurrenceDateStr(targetDay);

  await db.insert(recurringOccurrence).values({
    recurringItemId: newItem.id,
    expectedDate: firstDateStr,
    status: 'pending',
  });

  return newItem;
}

export async function getRecurringItemsWithOccurrences(workspaceId: string) {
  await ensureRecurringSchema();

  const items = await db.query.recurringItem.findMany({
    where: eq(recurringItem.workspaceId, workspaceId),
  });

  const itemIds = items.map(i => i.id);
  
  if (itemIds.length === 0) return [];

  // get pending occurrences
  const occurrences = await db.query.recurringOccurrence.findMany({
    where: and(
      eq(recurringOccurrence.status, 'pending'),
    ),
    orderBy: [recurringOccurrence.expectedDate],
  });

  return items.map(item => ({
    ...item,
    pendingOccurrences: occurrences.filter(o => o.recurringItemId === item.id)
  }));
}

export async function confirmOccurrence(
  occurrenceId: string, 
  workspaceId: string, 
  accountId: string, 
  userId: string,
  actualDateStr?: string,
  actualAmountMinor?: bigint,
  destinationAccountId?: string
) {
  await ensureRecurringSchema();

  // 1. Fetch occurrence and item securely
  const occurrence = await db.query.recurringOccurrence.findFirst({
    where: eq(recurringOccurrence.id, occurrenceId),
  });

  if (!occurrence || occurrence.status !== 'pending') throw new Error("Occurrence not found or already confirmed");

  const item = await db.query.recurringItem.findFirst({
    where: and(eq(recurringItem.id, occurrence.recurringItemId), eq(recurringItem.workspaceId, workspaceId))
  });

  if (!item) throw new Error("Item not found or unauthorized");

  const amountToRecord = actualAmountMinor ?? item.expectedAmountMinor;
  const dateToRecord = actualDateStr ? new Date(actualDateStr) : new Date(occurrence.expectedDate);
  const destAccountId = destinationAccountId || item.destinationAccountId || undefined;
  
  let txnId: string;

  if (item.type === 'transfer' || item.type === 'investment') {
    if (!destAccountId) {
      throw new Error("Destination account is required for transfer or investment recurring items");
    }

    // If destination is an investment account, ensure fresh live NAV snapshot before transfer
    if (item.type === 'investment') {
      const pos = await db.query.investmentPosition.findFirst({
        where: and(
          eq(investmentPosition.financialAccountId, destAccountId),
          eq(investmentPosition.workspaceId, workspaceId)
        ),
      });

      if (pos) {
        try {
          const liveQuote = await fetchInvestmentQuote(pos.name, pos.symbol || undefined);
          if (liveQuote.found && liveQuote.currentPrice && liveQuote.currentPrice > 0) {
            const currentNavMinor = BigInt(Math.round(liveQuote.currentPrice * 100));
            await db.insert(investmentPriceSnapshot).values({
              positionId: pos.id,
              provider: liveQuote.provider || 'MFAPI',
              symbol: pos.symbol || null,
              priceMinor: currentNavMinor,
              currency: item.currency,
              observedAt: new Date(),
              isEstimated: false,
            });
          }
        } catch (quoteErr) {
          console.warn('Live quote fetch during recurring investment failed:', quoteErr);
        }
      }
    }

    // createTransfer transfers funds from source to destination, and if destination is investment,
    // automatically computes units allocated using current NAV and creates the buy investmentTransaction!
    const transferTx = await createTransfer({
      workspaceId,
      sourceAccountId: accountId,
      destAccountId,
      amountMinor: amountToRecord,
      currency: item.currency,
      transactionDate: dateToRecord,
      description: item.type === 'investment' ? `SIP: ${item.name}` : item.name,
      source: 'recurring',
      createdByUserId: userId,
    });
    txnId = transferTx.id;
  } else if (item.type === 'expense') {
    const txn = await createExpense({
      workspaceId,
      amountMinor: amountToRecord,
      currency: item.currency,
      transactionDate: dateToRecord,
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
      amountMinor: amountToRecord,
      currency: item.currency,
      transactionDate: dateToRecord,
      accountId,
      categoryId: item.categoryId ?? undefined,
      description: item.name,
      source: 'recurring',
      createdByUserId: userId
    });
    txnId = txn.id;
  }

  // Mark occurrence as confirmed
  await db.update(recurringOccurrence).set({
    status: 'confirmed',
    actualDate: dateToRecord.toISOString().split('T')[0],
    actualAmountMinor: amountToRecord,
    transactionId: txnId,
    updatedAt: new Date()
  }).where(eq(recurringOccurrence.id, occurrenceId));

  // Generate next occurrence preserving exact day of month without weekend shifting
  const nextDateStr = calculateNextMonthlyDate(occurrence.expectedDate, item.customDay);

  await db.insert(recurringOccurrence).values({
    recurringItemId: item.id,
    expectedDate: nextDateStr,
    status: 'pending',
  });
}

export async function deleteRecurringItem(itemId: string, workspaceId: string) {
  await ensureRecurringSchema();

  return await db.transaction(async (tx) => {
    // 1. Delete all occurrences
    await tx.delete(recurringOccurrence).where(eq(recurringOccurrence.recurringItemId, itemId));
    // 2. Delete the recurring item
    await tx.delete(recurringItem).where(
      and(eq(recurringItem.id, itemId), eq(recurringItem.workspaceId, workspaceId))
    );
  });
}

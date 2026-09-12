import { db } from '../db';
import { recurringItem, recurringOccurrence, investmentPosition, investmentTransaction, investmentPriceSnapshot } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createExpense, createIncome } from './transaction';
import { fetchInvestmentQuote } from '../investments/quote';

export function getNextOccurrenceDate(baseDate: Date, dayRule: 'first_day' | 'last_working_day' | 'custom_day', customDay?: number | null): Date {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  
  const targetDate = new Date(Date.UTC(year, month + 1, 1));
  
  if (dayRule === 'first_day') {
    targetDate.setUTCDate(1);
    while (targetDate.getUTCDay() === 0 || targetDate.getUTCDay() === 6) {
      targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    }
  } else if (dayRule === 'last_working_day') {
    targetDate.setUTCMonth(targetDate.getUTCMonth() + 1);
    targetDate.setUTCDate(0); 
    while (targetDate.getUTCDay() === 0 || targetDate.getUTCDay() === 6) {
      targetDate.setUTCDate(targetDate.getUTCDate() - 1);
    }
  } else if (dayRule === 'custom_day' && customDay) {
    const lastDayOfMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)).getUTCDate();
    targetDate.setUTCDate(Math.min(customDay, lastDayOfMonth));
    if (targetDate.getUTCDay() === 6) targetDate.setUTCDate(targetDate.getUTCDate() - 1); 
    else if (targetDate.getUTCDay() === 0) targetDate.setUTCDate(targetDate.getUTCDate() + 1); 
  }
  
  return targetDate;
}

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

  // Create the first occurrence
  const today = new Date();
  const nextDate = getNextOccurrenceDate(today, data.dayRule, data.customDay);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  await db.insert(recurringOccurrence).values({
    recurringItemId: newItem.id,
    expectedDate: nextDateStr,
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

export async function confirmOccurrence(
  occurrenceId: string, 
  workspaceId: string, 
  accountId: string, 
  userId: string,
  actualDateStr?: string,
  actualAmountMinor?: bigint
) {
  // 1. Fetch occurrence and item securely
  const occurrence = await db.query.recurringOccurrence.findFirst({
    where: eq(recurringOccurrence.id, occurrenceId),
  });

  if (!occurrence || occurrence.status !== 'pending') throw new Error("Occurrence not found or already confirmed");

  const item = await db.query.recurringItem.findFirst({
    where: and(eq(recurringItem.id, occurrence.recurringItemId), eq(recurringItem.workspaceId, workspaceId))
  });

  if (!item) throw new Error("Item not found or unauthorized");

  // 2. Create actual transaction using existing domain service
  let txnId: string;
  const amountToRecord = actualAmountMinor ?? item.expectedAmountMinor;
  const dateToRecord = actualDateStr ? new Date(actualDateStr) : new Date(occurrence.expectedDate);
  
  if (item.type === 'expense') {
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

  // 3. If this recurring item is tied to an investment account (SIP), calculate units allocated based on current NAV
  if (item.defaultAccountId) {
    const pos = await db.query.investmentPosition.findFirst({
      where: and(
        eq(investmentPosition.financialAccountId, item.defaultAccountId),
        eq(investmentPosition.workspaceId, workspaceId)
      ),
    });
    if (pos) {
      // 1. Check for most recent price snapshot
      const latestSnapshot = await db.query.investmentPriceSnapshot.findFirst({
        where: eq(investmentPriceSnapshot.positionId, pos.id),
        orderBy: [desc(investmentPriceSnapshot.observedAt)],
      });

      let currentNavMinor = latestSnapshot?.priceMinor ? BigInt(latestSnapshot.priceMinor) : 0n;

      // 2. Fetch live quote to obtain the freshest current NAV
      try {
        const liveQuote = await fetchInvestmentQuote(pos.name, pos.symbol || undefined);
        if (liveQuote.found && liveQuote.currentPrice && liveQuote.currentPrice > 0) {
          currentNavMinor = BigInt(Math.round(liveQuote.currentPrice * 100));
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
        console.warn('Failed to fetch live quote during SIP execution:', quoteErr);
      }

      // 3. Fallback if current NAV is still unpopulated
      if (currentNavMinor <= 0n) {
        currentNavMinor = pos.averageCostMinor && pos.averageCostMinor > 0n ? pos.averageCostMinor : 1000n;
      }

      // 4. Calculate units allocated based on current NAV
      const incrementalUnits = Number(amountToRecord) / Number(currentNavMinor);
      const currentUnits = Number(pos.units || 0);
      const newTotalUnits = (currentUnits + incrementalUnits).toFixed(4);

      // 5. Recalculate weighted average cost
      const prevCostBasis = Math.round(currentUnits * Number(pos.averageCostMinor || currentNavMinor));
      const newCostBasis = prevCostBasis + Number(amountToRecord);
      const totalUnitsNum = Number(newTotalUnits);
      const newAvgCostMinor = totalUnitsNum > 0
        ? BigInt(Math.round(newCostBasis / totalUnitsNum))
        : currentNavMinor;

      await db.update(investmentPosition).set({
        units: newTotalUnits,
        averageCostMinor: newAvgCostMinor,
        updatedAt: new Date(),
      }).where(eq(investmentPosition.id, pos.id));

      await db.insert(investmentTransaction).values({
        workspaceId,
        positionId: pos.id,
        transactionId: txnId,
        transactionType: 'buy',
        units: incrementalUnits.toFixed(4),
        priceMinor: currentNavMinor,
        amountMinor: amountToRecord,
        currency: item.currency,
        transactionDate: dateToRecord.toISOString().split('T')[0],
      });
    }
  }

  // 4. Mark occurrence as confirmed
  await db.update(recurringOccurrence).set({
    status: 'confirmed',
    actualDate: dateToRecord.toISOString().split('T')[0],
    actualAmountMinor: amountToRecord,
    transactionId: txnId,
    updatedAt: new Date()
  }).where(eq(recurringOccurrence.id, occurrenceId));

  // 4. Generate next occurrence
  const currentExpected = new Date(occurrence.expectedDate);
  const nextDate = getNextOccurrenceDate(currentExpected, item.dayRule, item.customDay);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  await db.insert(recurringOccurrence).values({
    recurringItemId: item.id,
    expectedDate: nextDateStr,
    status: 'pending',
  });
}

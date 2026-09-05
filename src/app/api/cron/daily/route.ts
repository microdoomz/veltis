import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recurringItem,
  recurringOccurrence,
  investmentPosition,
  investmentPriceSnapshot,
} from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { getNextOccurrenceDate } from '@/lib/services/recurring';
import { marketProvider } from '@/lib/investments/provider';

async function handleDailyCron(req: NextRequest) {
  // 1. Validate Cron Secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('Authorization');
  const querySecret = req.nextUrl.searchParams.get('key');

  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : querySecret;

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  const results = {
    timestamp: new Date().toISOString(),
    recurringProcessed: 0,
    recurringGenerated: 0,
    investmentPricesUpdated: 0,
    errors: [] as string[],
  };

  // 2. Process Recurring Items
  try {
    const activeRecurring = await db.query.recurringItem.findMany({
      where: eq(recurringItem.active, true),
    });

    results.recurringProcessed = activeRecurring.length;

    for (const item of activeRecurring) {
      try {
        // Check if there is already an active pending occurrence
        const pending = await db.query.recurringOccurrence.findFirst({
          where: and(
            eq(recurringOccurrence.recurringItemId, item.id),
            eq(recurringOccurrence.status, 'pending')
          ),
        });

        if (!pending) {
          // Generate next occurrence
          const nextDate = getNextOccurrenceDate(new Date(), item.dayRule, item.customDay);
          const nextDateStr = nextDate.toISOString().split('T')[0];

          await db.insert(recurringOccurrence).values({
            recurringItemId: item.id,
            expectedDate: nextDateStr,
            status: 'pending',
          });

          results.recurringGenerated++;
        }
      } catch (itemErr: unknown) {
        results.errors.push(`Recurring item ${item.id}: ${itemErr instanceof Error ? itemErr.message : 'Unknown error'}`);
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Recurring batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // 3. Process Investment Positions Market Snapshots
  try {
    const activePositions = await db.query.investmentPosition.findMany({
      where: and(
        isNotNull(investmentPosition.symbol),
        sql`${investmentPosition.units}::numeric > 0`
      ),
    });

    for (const pos of activePositions) {
      if (!pos.symbol) continue;

      try {
        const quote = await marketProvider.fetchPrice(pos.symbol);
        if (quote) {
          await db.insert(investmentPriceSnapshot).values({
            positionId: pos.id,
            provider: marketProvider.getProviderName(),
            symbol: pos.symbol,
            priceMinor: quote.priceMinor,
            currency: quote.currency,
            observedAt: new Date(),
            isEstimated: true,
          });
          results.investmentPricesUpdated++;
        }
      } catch (posErr: unknown) {
        results.errors.push(`Position ${pos.symbol}: ${posErr instanceof Error ? posErr.message : 'Unknown error'}`);
      }
    }
  } catch (err: unknown) {
    results.errors.push(`Investments snapshot batch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return NextResponse.json({
    success: true,
    ...results,
  });
}

export async function GET(req: NextRequest) {
  return handleDailyCron(req);
}

export async function POST(req: NextRequest) {
  return handleDailyCron(req);
}

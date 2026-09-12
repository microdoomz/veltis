import { db } from '../db';
import { transaction, category, financialAccount, investmentPosition, investmentPriceSnapshot, budget } from '../db/schema';
import { eq, and, gte, lte, sql, desc, inArray } from 'drizzle-orm';

export type TimeFilter = {
  startDate: Date;
  endDate: Date;
};

// 1. Overview Analytics
export async function getOverviewAnalytics(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const result = await db
    .select({
      transactionType: transaction.transactionType,
      totalAmountMinor: sql<string>`sum(${transaction.amountMinor})`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        eq(transaction.status, 'active'),
        gte(transaction.transactionDate, startStr),
        lte(transaction.transactionDate, endStr),
        inArray(transaction.transactionType, ['expense', 'income'])
      )
    )
    .groupBy(transaction.transactionType);

  let totalSpending = 0n;
  let totalIncome = 0n;

  for (const row of result) {
    if (row.transactionType === 'expense') {
      totalSpending = BigInt(row.totalAmountMinor || '0');
    } else if (row.transactionType === 'income') {
      totalIncome = BigInt(row.totalAmountMinor || '0');
    }
  }

  return {
    totalSpending,
    totalIncome,
    netDifference: totalIncome - totalSpending,
  };
}

// 2. Spending Analytics
export async function getSpendingAnalytics(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const result = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      totalAmountMinor: sql<string>`sum(${transaction.amountMinor})`,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        eq(transaction.status, 'active'),
        eq(transaction.transactionType, 'expense'),
        gte(transaction.transactionDate, startStr),
        lte(transaction.transactionDate, endStr)
      )
    )
    .groupBy(transaction.categoryId, category.name)
    .orderBy(desc(sql`sum(${transaction.amountMinor})`));

  return result.map((r) => ({
    categoryId: r.categoryId || 'uncategorized',
    categoryName: r.categoryName || 'Uncategorized',
    totalAmountMinor: BigInt(r.totalAmountMinor || '0'),
  }));
}

// 3. Income Analytics
export async function getIncomeAnalytics(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const result = await db
    .select({
      categoryId: transaction.categoryId,
      categoryName: category.name,
      totalAmountMinor: sql<string>`sum(${transaction.amountMinor})`,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        eq(transaction.status, 'active'),
        eq(transaction.transactionType, 'income'),
        gte(transaction.transactionDate, startStr),
        lte(transaction.transactionDate, endStr)
      )
    )
    .groupBy(transaction.categoryId, category.name)
    .orderBy(desc(sql`sum(${transaction.amountMinor})`));

  return result.map((r) => ({
    categoryId: r.categoryId || 'uncategorized',
    categoryName: r.categoryName || 'Uncategorized',
    totalAmountMinor: BigInt(r.totalAmountMinor || '0'),
  }));
}

// 4. Wealth Analytics (Trend)
export async function getWealthTrendAnalytics(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const result = await db
    .select({
      date: transaction.transactionDate,
      transactionType: transaction.transactionType,
      totalAmountMinor: sql<string>`sum(${transaction.amountMinor})`,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        eq(transaction.status, 'active'),
        gte(transaction.transactionDate, startStr),
        lte(transaction.transactionDate, endStr),
        inArray(transaction.transactionType, ['expense', 'income'])
      )
    )
    .groupBy(transaction.transactionDate, transaction.transactionType)
    .orderBy(transaction.transactionDate);

  // Group by date
  const trend: Record<string, { income: bigint; expense: bigint; net: bigint }> = {};
  
  for (const row of result) {
    const dateStr = row.date;
    if (!trend[dateStr]) {
      trend[dateStr] = { income: 0n, expense: 0n, net: 0n };
    }
    
    const amt = BigInt(row.totalAmountMinor || '0');
    if (row.transactionType === 'income') {
      trend[dateStr].income += amt;
      trend[dateStr].net += amt;
    } else if (row.transactionType === 'expense') {
      trend[dateStr].expense += amt;
      trend[dateStr].net -= amt;
    }
  }

  // Convert to array
  return Object.keys(trend).sort().map(date => ({
    date,
    ...trend[date]
  }));
}

// 5. Investment Analytics
export async function getInvestmentAnalytics(workspaceId: string) {
  // Fetch active investment accounts only
  const activeAccounts = await db.query.financialAccount.findMany({
    where: and(
      eq(financialAccount.workspaceId, workspaceId),
      eq(financialAccount.accountType, 'investment'),
      eq(financialAccount.status, 'active')
    ),
  });

  const activeAccountIds = activeAccounts.map(a => a.id);
  if (activeAccountIds.length === 0) {
    return {
      positions: [],
      summary: {
        totalValueMinor: 0n,
        totalCostMinor: 0n,
        totalUnrealizedGainLoss: 0n,
        totalGainPct: 0,
      }
    };
  }

  const positions = await db.query.investmentPosition.findMany({
    where: and(
      eq(investmentPosition.workspaceId, workspaceId),
      inArray(investmentPosition.financialAccountId, activeAccountIds)
    ),
  });

  const positionIds = positions.map(p => p.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let latestSnapshots: any[] = [];
  if (positionIds.length > 0) {
    const allSnapshots = await db.query.investmentPriceSnapshot.findMany({
      where: inArray(investmentPriceSnapshot.positionId, positionIds),
      orderBy: [desc(investmentPriceSnapshot.observedAt)],
    });

    const seen = new Set();
    latestSnapshots = allSnapshots.filter(s => {
      if (seen.has(s.positionId)) return false;
      seen.add(s.positionId);
      return true;
    });
  }

  let totalValueMinor = 0n;
  let totalCostMinor = 0n;

  const enrichedPositions = positions.map(pos => {
    const snapshot = latestSnapshots.find(s => s.positionId === pos.id);
    const units = Number(pos.units || 0);
    const avgCost = BigInt(pos.averageCostMinor || 0);
    const currentPrice = BigInt(snapshot?.priceMinor || pos.averageCostMinor || 0);

    const invested = BigInt(Math.round(units * Number(avgCost)));
    const current = BigInt(Math.round(units * Number(currentPrice)));
    const gain = current - invested;
    const gainPct = invested > 0n ? (Number(gain) / Number(invested)) * 100 : 0;

    totalValueMinor += current;
    totalCostMinor += invested;

    return {
      id: pos.id,
      financialAccountId: pos.financialAccountId,
      name: pos.name,
      symbol: pos.symbol,
      assetType: pos.assetType,
      units: pos.units,
      averageCostMinor: pos.averageCostMinor,
      currentPriceMinor: currentPrice,
      latestPriceMinor: currentPrice,
      estimatedValueMinor: current,
      totalCostPosition: invested,
      unrealizedGainLoss: gain,
      unrealizedGainLossPct: gainPct,
      currency: pos.currency,
      isEstimated: !!snapshot,
    };
  });

  const totalGainMinor = totalValueMinor - totalCostMinor;
  const totalGainPct = totalCostMinor > 0n ? (Number(totalGainMinor) / Number(totalCostMinor)) * 100 : 0;

  return {
    positions: enrichedPositions,
    summary: {
      totalValueMinor,
      totalCostMinor,
      totalUnrealizedGainLoss: totalGainMinor,
      totalGainPct,
    }
  };
}

// 6. Budget Analytics
export async function getBudgetAnalytics(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const budgets = await db
    .select({
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: category.name,
      amountMinor: budget.amountMinor,
      periodStartDate: budget.periodStartDate,
      periodEndDate: budget.periodEndDate,
    })
    .from(budget)
    .leftJoin(category, eq(budget.categoryId, category.id))
    .where(
      and(
        eq(budget.workspaceId, workspaceId),
        gte(budget.periodStartDate, startStr),
        lte(budget.periodEndDate, endStr)
      )
    );

  const budgetWithSpent = await Promise.all(budgets.map(async (b) => {
    // Note: This is a simplified way to get spent amounts. In a real app we might want 
    // a single query to get all expenses and group them by category.
    const result = await db
      .select({ totalSpent: sql<string>`sum(${transaction.amountMinor})` })
      .from(transaction)
      .where(
        and(
          eq(transaction.workspaceId, workspaceId),
          eq(transaction.categoryId, b.categoryId),
          eq(transaction.status, 'active'),
          eq(transaction.transactionType, 'expense'),
          gte(transaction.transactionDate, b.periodStartDate),
          lte(transaction.transactionDate, b.periodEndDate)
        )
      );

    const spentMinor = BigInt(result[0]?.totalSpent || '0');
    return {
      ...b,
      categoryName: b.categoryName || 'Unknown Category',
      spentMinor,
      remainingMinor: b.amountMinor - spentMinor,
      percentUsed: Number(spentMinor) / Number(b.amountMinor)
    };
  }));

  return budgetWithSpent;
}

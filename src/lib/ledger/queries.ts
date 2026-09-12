import { eq, desc, asc, and, ne, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  transaction,
  financialAccount,
  transactionLeg,
  category,
  allocation,
  investmentPosition,
  investmentPriceSnapshot,
} from '../db/schema';
import { getAccountLedgerBalance } from './index';

export async function getCategories(workspaceId: string) {
  return await db.query.category.findMany({
    where: eq(category.workspaceId, workspaceId),
    orderBy: [category.name]
  });
}

export async function getAccountById(workspaceId: string, accountId: string) {
  const account = await db.query.financialAccount.findFirst({
    where: and(
      eq(financialAccount.id, accountId),
      eq(financialAccount.workspaceId, workspaceId),
      eq(financialAccount.status, 'active')
    )
  });

  if (!account) return null;
  
  let balanceMinor = await getAccountLedgerBalance(accountId);

  if (account.accountType === 'investment') {
    const pos = await db.query.investmentPosition.findFirst({
      where: and(
        eq(investmentPosition.financialAccountId, accountId),
        eq(investmentPosition.workspaceId, workspaceId)
      ),
    });

    if (pos) {
      const units = Number(pos.units || 0);
      const latestSnapshot = await db.query.investmentPriceSnapshot.findFirst({
        where: eq(investmentPriceSnapshot.positionId, pos.id),
        orderBy: [desc(investmentPriceSnapshot.observedAt)],
      });
      const currentPrice = BigInt(latestSnapshot?.priceMinor || pos.averageCostMinor || 0);
      if (units > 0 && currentPrice > 0n) {
        balanceMinor = BigInt(Math.round(units * Number(currentPrice)));
      }
    }
  }

  return { ...account, balanceMinor };
}

export async function getAccountTransactions(accountId: string, limit: number = 50) {
  const legs = await db.query.transactionLeg.findMany({
    where: eq(transactionLeg.accountId, accountId),
    orderBy: [desc(transactionLeg.createdAt)],
    limit: Math.max(limit * 3, 50),
    with: {
      transaction: {
        with: {
          category: true,
          legs: {
            with: {
              account: true
            }
          }
        }
      }
    }
  });

  const validTxns = legs
    .filter(leg => leg.transaction && leg.transaction.status !== 'deleted' && leg.transaction.status !== 'voided')
    .map(leg => leg.transaction)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
    });

  const uniqueTxns = Array.from(new Map(validTxns.map(t => [t.id, t])).values()).slice(0, limit);

  return uniqueTxns;
}

export async function getTransactionById(workspaceId: string, transactionId: string) {
  return await db.query.transaction.findFirst({
    where: and(
      eq(transaction.id, transactionId),
      eq(transaction.workspaceId, workspaceId),
      ne(transaction.status, 'deleted')
    ),
    with: {
      category: true,
      legs: {
        with: {
          account: true
        }
      }
    }
  });
}

export interface TransactionFilters {
  categoryId?: string;
  accountId?: string;
  flowType?: 'all' | 'income' | 'expense' | 'transfer';
  source?: 'all' | 'web' | 'shortcut' | 'import';
  startDate?: string;
  endDate?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export async function getRecentTransactions(
  workspaceId: string,
  limit: number = 250,
  filterOrCategory?: string | TransactionFilters
) {
  const filters: TransactionFilters = typeof filterOrCategory === 'string'
    ? { categoryId: filterOrCategory }
    : (filterOrCategory || {});

  const conditions = [
    eq(transaction.workspaceId, workspaceId),
    ne(transaction.status, 'deleted'),
    ne(transaction.status, 'voided')
  ];

  if (filters.categoryId && filters.categoryId !== 'all') {
    conditions.push(eq(transaction.categoryId, filters.categoryId));
  }

  if (filters.flowType && filters.flowType !== 'all') {
    conditions.push(eq(transaction.transactionType, filters.flowType as any));
  }

  if (filters.source && filters.source !== 'all') {
    if (filters.source === 'shortcut') {
      conditions.push(eq(transaction.source, 'shortcut'));
    } else if (filters.source === 'import') {
      conditions.push(eq(transaction.source, 'import'));
    } else if (filters.source === 'web') {
      conditions.push(inArray(transaction.source, ['web', 'manual']));
    }
  }

  if (filters.startDate) {
    conditions.push(gte(transaction.transactionDate, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(transaction.transactionDate, filters.endDate));
  }

  // By default, most recently added/created transactions are strictly at the top.
  let orderClauses = [desc(transaction.createdAt), desc(transaction.transactionDate)];
  if (filters.sortBy === 'date_desc') {
    orderClauses = [desc(transaction.transactionDate), desc(transaction.createdAt)];
  } else if (filters.sortBy === 'date_asc') {
    orderClauses = [asc(transaction.transactionDate), asc(transaction.createdAt)];
  } else if (filters.sortBy === 'amount_desc') {
    orderClauses = [desc(transaction.amountMinor), desc(transaction.createdAt)];
  } else if (filters.sortBy === 'amount_asc') {
    orderClauses = [asc(transaction.amountMinor), desc(transaction.createdAt)];
  }

  let txs = await db.query.transaction.findMany({
    where: and(...conditions),
    orderBy: orderClauses,
    limit,
    with: {
      legs: {
        with: {
          account: true
        }
      },
      category: true
    }
  });

  if (filters.accountId && filters.accountId !== 'all') {
    txs = txs.filter(t => t.legs?.some(leg => leg.accountId === filters.accountId));
  }

  return txs;
}

export async function getAccountSummary(workspaceId: string) {
  const accounts = await db.query.financialAccount.findMany({
    where: and(
      eq(financialAccount.workspaceId, workspaceId),
      eq(financialAccount.status, 'active')
    ),
    orderBy: [asc(financialAccount.displayOrder), asc(financialAccount.createdAt)],
  });

  const activeAllocations = await db.query.allocation.findMany({
    where: and(
      eq(allocation.workspaceId, workspaceId),
      eq(allocation.status, 'active')
    )
  });

  // Fetch investment positions and their latest price snapshots for this workspace
  const positions = await db.query.investmentPosition.findMany({
    where: eq(investmentPosition.workspaceId, workspaceId),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionIds = positions.map((p: any) => p.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let latestSnapshots: any[] = [];
  if (positionIds.length > 0) {
    const allSnapshots = await db.query.investmentPriceSnapshot.findMany({
      where: inArray(investmentPriceSnapshot.positionId, positionIds),
      orderBy: [desc(investmentPriceSnapshot.observedAt)],
    });
    const seen = new Set();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latestSnapshots = allSnapshots.filter((s: any) => {
      if (seen.has(s.positionId)) return false;
      seen.add(s.positionId);
      return true;
    });
  }

  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      let balance = await getAccountLedgerBalance(acc.id);

      // If investment account, calculate current value based on how investments are doing currently (units * current NAV/price)
      if (acc.accountType === 'investment') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pos = positions.find((p: any) => p.financialAccountId === acc.id);
        if (pos) {
          const units = Number(pos.units || 0);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const snapshot = latestSnapshots.find((s: any) => s.positionId === pos.id);
          const currentPrice = BigInt(snapshot?.priceMinor || pos.averageCostMinor || 0);
          if (units > 0 && currentPrice > 0n) {
            balance = BigInt(Math.round(units * Number(currentPrice)));
          }
        }
      }

      const accAllocations = activeAllocations.filter(a => a.financialAccountId === acc.id);
      const totalAllocatedMinor = accAllocations.reduce((sum, a) => sum + BigInt(a.amountMinor), 0n);
      const freeToSpendMinor = balance - totalAllocatedMinor;
      return {
        ...acc,
        balanceMinor: balance,
        allocations: accAllocations,
        totalAllocatedMinor,
        freeToSpendMinor,
      };
    })
  );

  return accountsWithBalances;
}

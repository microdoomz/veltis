import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { db } from '../db';
import {
  financialAccount,
  transactionLeg,
  transaction,
  heldForOther,
  accountState,
  allocation,
  investmentPosition,
  investmentPriceSnapshot,
} from '../db/schema';
import { NotFoundError } from '../services/errors';

/**
 * Ledger balance strictly computes the math of all active transactions.
 * Returns the balance using standard accounting sign:
 * Positive = Debit balance (Asset has value)
 * Negative = Credit balance (Liability has debt, or Asset is overdrawn)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAccountLedgerBalance(accountId: string, dbTx: any = db): Promise<bigint> {
  const result = await dbTx
    .select({
      openingBalance: financialAccount.openingBalanceMinor,
      type: financialAccount.accountType,
      // Sum debits as positive, credits as negative (ignoring reference_only and deleted transactions)
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transaction.status} NOT IN ('deleted', 'voided') AND ${transactionLeg.legRole} != 'reference_only' THEN
            CASE 
              WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
              ELSE -${transactionLeg.amountMinor}
            END
          ELSE 0
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .leftJoin(
      transaction,
      eq(transaction.id, transactionLeg.transactionId)
    )
    .where(eq(financialAccount.id, accountId))
    .groupBy(financialAccount.id);

  if (!result || result.length === 0) {
    throw new NotFoundError(`Account ${accountId} not found`);
  }

  const { openingBalance, legSum } = result[0];
  return BigInt(openingBalance) + BigInt(legSum);
}

/**
 * Available Money = Sum of Liquid Asset Accounts - Sum of active Liens - Sum of active Held For Others.
 * Liquid Asset Accounts = bank, cash_wallet, digital_wallet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAvailableMoney(workspaceId: string, dbTx: any = db): Promise<bigint> {
  // 1. Sum of liquid asset balances
  const liquidAccounts = await dbTx
    .select({
      id: financialAccount.id,
      openingBalance: financialAccount.openingBalanceMinor,
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transaction.status} NOT IN ('deleted', 'voided') AND ${transactionLeg.legRole} != 'reference_only' THEN
            CASE 
              WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
              ELSE -${transactionLeg.amountMinor}
            END
          ELSE 0
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .leftJoin(
      transaction,
      eq(transaction.id, transactionLeg.transactionId)
    )
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active'),
        inArray(financialAccount.accountType, ['bank', 'cash_wallet', 'digital_wallet'])
      )
    )
    .groupBy(financialAccount.id);

  let totalLiquidAssets = 0n;
  for (const acc of liquidAccounts) {
    totalLiquidAssets += BigInt(acc.openingBalance) + BigInt(acc.legSum);
  }

  // 2. Sum of active liens and set-aside allocations across those same accounts
  const liensResult = await dbTx
    .select({
      totalLiens: sql<string>`COALESCE(SUM(${accountState.lienAmountMinor}), 0)`
    })
    .from(accountState)
    .innerJoin(financialAccount, eq(financialAccount.id, accountState.financialAccountId))
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active'),
        inArray(financialAccount.accountType, ['bank', 'cash_wallet', 'digital_wallet'])
      )
    );
  const totalLiens = BigInt(liensResult[0]?.totalLiens || 0);

  // Direct active allocations check
  const allocResult = await dbTx
    .select({
      totalAlloc: sql<string>`COALESCE(SUM(${allocation.amountMinor}), 0)`
    })
    .from(allocation)
    .innerJoin(financialAccount, eq(financialAccount.id, allocation.financialAccountId))
    .where(
      and(
        eq(allocation.workspaceId, workspaceId),
        eq(allocation.status, 'active'),
        eq(financialAccount.status, 'active'),
        inArray(financialAccount.accountType, ['bank', 'cash_wallet', 'digital_wallet'])
      )
    );
  const totalAlloc = BigInt(allocResult[0]?.totalAlloc || 0);
  const totalDeducted = totalLiens > totalAlloc ? totalLiens : totalAlloc;

  // 3. Sum of Held For Others
  const heldResult = await dbTx
    .select({
      totalHeld: sql<string>`COALESCE(SUM(${heldForOther.amountMinor}), 0)`
    })
    .from(heldForOther)
    .innerJoin(financialAccount, eq(financialAccount.id, heldForOther.accountId))
    .where(
      and(
        eq(heldForOther.workspaceId, workspaceId),
        eq(heldForOther.status, 'open'),
        eq(financialAccount.status, 'active'),
        inArray(financialAccount.accountType, ['bank', 'cash_wallet', 'digital_wallet'])
      )
    );
  const totalHeld = BigInt(heldResult[0]?.totalHeld || 0);

  return totalLiquidAssets - totalDeducted - totalHeld;
}

export interface LiquidSummary {
  totalLiquid: bigint;
  freeToSpend: bigint;
  totalAllocated: bigint;
  freeToSpendCash: bigint;
  freeToSpendOnline: bigint;
}

/**
 * Net Wealth = Sum of all active accounts (matching the Accounts page calculation).
 * Non-credit cards add to wealth, credit cards subtract debt.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNetWealth(workspaceId: string, dbTx: any = db): Promise<bigint> {
  const accounts = await dbTx
    .select({
      id: financialAccount.id,
      accountType: financialAccount.accountType,
      openingBalance: financialAccount.openingBalanceMinor,
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transaction.status} NOT IN ('deleted', 'voided') AND ${transactionLeg.legRole} != 'reference_only' THEN
            CASE 
              WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
              ELSE -${transactionLeg.amountMinor}
            END
          ELSE 0
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .leftJoin(
      transaction,
      eq(transaction.id, transactionLeg.transactionId)
    )
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active')
      )
    )
    .groupBy(financialAccount.id);

  // Fetch investment positions for this workspace to compute live market valuation
  const positions = await dbTx.query.investmentPosition.findMany({
    where: eq(investmentPosition.workspaceId, workspaceId),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionIds = positions.map((p: any) => p.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let latestSnapshots: any[] = [];
  if (positionIds.length > 0) {
    const allSnapshots = await dbTx.query.investmentPriceSnapshot.findMany({
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

  let netWealth = 0n;
  for (const acc of accounts) {
    let bal = BigInt(acc.openingBalance) + BigInt(acc.legSum);

    // If investment account, calculate current wealth based on how investments are doing currently (units * current NAV/price)
    if (acc.accountType === 'investment') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = positions.find((p: any) => p.financialAccountId === acc.id);
      if (pos) {
        const units = Number(pos.units || 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snapshot = latestSnapshots.find((s: any) => s.positionId === pos.id);
        const currentPrice = BigInt(snapshot?.priceMinor || pos.averageCostMinor || 0);
        if (units > 0 && currentPrice > 0n) {
          bal = BigInt(Math.round(units * Number(currentPrice)));
        }
      }
    }

    if (acc.accountType === 'credit_card') {
      netWealth -= bal;
    } else {
      netWealth += bal;
    }
  }

  return netWealth;
}

/**
 * Liquid Balance = Sum of liquid accounts (bank, cash_wallet, digital_wallet).
 * Available Free to Spend = Liquid Balance - Total Allocations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLiquidSummary(workspaceId: string, dbTx: any = db): Promise<LiquidSummary> {
  // Directly sum liquid asset balances (bank, cash_wallet, digital_wallet)
  const liquidAccounts = await dbTx
    .select({
      id: financialAccount.id,
      openingBalance: financialAccount.openingBalanceMinor,
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transaction.status} NOT IN ('deleted', 'voided') AND ${transactionLeg.legRole} != 'reference_only' THEN
            CASE 
              WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
              ELSE -${transactionLeg.amountMinor}
            END
          ELSE 0
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .leftJoin(
      transaction,
      eq(transaction.id, transactionLeg.transactionId)
    )
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active'),
        inArray(financialAccount.accountType, ['bank', 'cash_wallet', 'digital_wallet'])
      )
    )
    .groupBy(financialAccount.id);

  let totalLiquid = 0n;
  for (const acc of liquidAccounts) {
    totalLiquid += BigInt(acc.openingBalance) + BigInt(acc.legSum);
  }

  // Active allocations across active accounts
  const allocResult = await dbTx
    .select({
      totalAlloc: sql<string>`COALESCE(SUM(${allocation.amountMinor}), 0)`
    })
    .from(allocation)
    .innerJoin(financialAccount, eq(financialAccount.id, allocation.financialAccountId))
    .where(
      and(
        eq(allocation.workspaceId, workspaceId),
        eq(allocation.status, 'active'),
        eq(financialAccount.status, 'active')
      )
    );
  const totalAllocated = BigInt(allocResult[0]?.totalAlloc || 0);

  // Free to spend = Liquid Balance - Total Allocations
  const freeToSpend = totalLiquid - totalAllocated;

  // Compute Cash vs Online breakdown
  // 1. Total Cash Balance
  const cashAccounts = await dbTx
    .select({
      id: financialAccount.id,
      openingBalance: financialAccount.openingBalanceMinor,
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transaction.status} NOT IN ('deleted', 'voided') AND ${transactionLeg.legRole} != 'reference_only' THEN
            CASE 
              WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
              ELSE -${transactionLeg.amountMinor}
            END
          ELSE 0
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .leftJoin(
      transaction,
      eq(transaction.id, transactionLeg.transactionId)
    )
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active'),
        eq(financialAccount.accountType, 'cash_wallet')
      )
    )
    .groupBy(financialAccount.id);

  let totalCashBalance = 0n;
  for (const acc of cashAccounts) {
    totalCashBalance += BigInt(acc.openingBalance) + BigInt(acc.legSum);
  }

  // Active allocations on cash wallets
  const cashAllocResult = await dbTx
    .select({
      totalAlloc: sql<string>`COALESCE(SUM(${allocation.amountMinor}), 0)`
    })
    .from(allocation)
    .innerJoin(financialAccount, eq(financialAccount.id, allocation.financialAccountId))
    .where(
      and(
        eq(allocation.workspaceId, workspaceId),
        eq(allocation.status, 'active'),
        eq(financialAccount.status, 'active'),
        eq(financialAccount.accountType, 'cash_wallet')
      )
    );
  const totalCashAllocated = BigInt(cashAllocResult[0]?.totalAlloc || 0);

  let freeToSpendCash = totalCashBalance - totalCashAllocated;
  if (freeToSpendCash < 0n) freeToSpendCash = 0n;

  if (freeToSpend > 0n && freeToSpendCash > freeToSpend) {
    freeToSpendCash = freeToSpend;
  } else if (freeToSpend <= 0n) {
    freeToSpendCash = 0n;
  }

  const freeToSpendOnline = freeToSpend - freeToSpendCash;

  return {
    totalLiquid,
    freeToSpend,
    totalAllocated,
    freeToSpendCash,
    freeToSpendOnline,
  };
}

import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  financialAccount,
  transactionLeg,
  transaction,
  heldForOther,
  accountState,
  allocation
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

  let netWealth = 0n;
  for (const acc of accounts) {
    const bal = BigInt(acc.openingBalance) + BigInt(acc.legSum);
    if (acc.accountType === 'credit_card') {
      netWealth -= bal;
    } else {
      netWealth += bal;
    }
  }

  return netWealth;
}

/**
 * Liquid Balance = Total Wealth - Total Investments.
 * Available Free to Spend = Liquid Balance - Total Allocations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLiquidSummary(workspaceId: string, dbTx: any = db): Promise<LiquidSummary> {
  const totalWealth = await getNetWealth(workspaceId, dbTx);

  // Total Investments = sum of balanceMinor of all active investment accounts
  const investmentAccounts = await dbTx
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
        eq(financialAccount.accountType, 'investment')
      )
    )
    .groupBy(financialAccount.id);

  let totalInvestments = 0n;
  for (const acc of investmentAccounts) {
    totalInvestments += BigInt(acc.openingBalance) + BigInt(acc.legSum);
  }

  // Liquid Balance = Total Wealth - Total Investments
  const totalLiquid = totalWealth - totalInvestments;

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

  return {
    totalLiquid,
    freeToSpend,
    totalAllocated,
  };
}

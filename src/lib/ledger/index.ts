import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  financialAccount,
  transactionLeg,
  transaction,
  heldForOther,
  accountState,
  investmentPosition,
  receivable,
  liability
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
      // Sum debits as positive, credits as negative
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
          ELSE -${transactionLeg.amountMinor}
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .innerJoin(
      transaction,
      and(
        eq(transaction.id, transactionLeg.transactionId),
        ne(transaction.status, 'deleted'),
        ne(transaction.status, 'voided')
      )
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
          WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
          ELSE -${transactionLeg.amountMinor}
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .innerJoin(
      transaction,
      and(
        eq(transaction.id, transactionLeg.transactionId),
        ne(transaction.status, 'deleted'),
        ne(transaction.status, 'voided')
      )
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

  // 2. Sum of active liens across those same accounts
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

  // 3. Sum of Held For Others
  const heldResult = await dbTx
    .select({
      totalHeld: sql<string>`COALESCE(SUM(${heldForOther.amountMinor}), 0)`
    })
    .from(heldForOther)
    .where(
      and(
        eq(heldForOther.workspaceId, workspaceId),
        eq(heldForOther.status, 'open')
      )
    );
  const totalHeld = BigInt(heldResult[0]?.totalHeld || 0);

  return totalLiquidAssets - totalLiens - totalHeld;
}

/**
 * Net Wealth = Asset Accounts + Investments + Receivables - Liability Accounts - Custom Liabilities.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNetWealth(workspaceId: string, dbTx: any = db): Promise<bigint> {
  // 1. Sum of ALL asset account balances (bank, cash, digital, investment)
  // 2. Sum of ALL liability account balances (credit_card) - these will naturally be negative via standard ledger math if they hold a balance.
  const allAccounts = await dbTx
    .select({
      openingBalance: financialAccount.openingBalanceMinor,
      legSum: sql<string>`COALESCE(SUM(
        CASE 
          WHEN ${transactionLeg.direction} = 'debit' THEN ${transactionLeg.amountMinor}
          ELSE -${transactionLeg.amountMinor}
        END
      ), 0)`,
    })
    .from(financialAccount)
    .leftJoin(transactionLeg, eq(transactionLeg.accountId, financialAccount.id))
    .innerJoin(
      transaction,
      and(
        eq(transaction.id, transactionLeg.transactionId),
        ne(transaction.status, 'deleted'),
        ne(transaction.status, 'voided')
      )
    )
    .where(
      and(
        eq(financialAccount.workspaceId, workspaceId),
        eq(financialAccount.status, 'active')
      )
    )
    .groupBy(financialAccount.id);

  let ledgerSum = 0n;
  for (const acc of allAccounts) {
    // Both assets and liabilities combine here since credit card debt is a negative balance in ledger math
    ledgerSum += BigInt(acc.openingBalance) + BigInt(acc.legSum);
  }

  // Add investments (assuming units * price, but for V1 schema there's no live value materialized on the position.
  // Wait, investment positions need to be evaluated based on current price, or average_cost. 
  // Let's use average_cost_minor * units as a placeholder for Net Wealth if live price isn't joined.
  const investments = await dbTx
    .select({
      units: investmentPosition.units,
      averageCost: investmentPosition.averageCostMinor
    })
    .from(investmentPosition)
    .where(eq(investmentPosition.workspaceId, workspaceId));
    
  let investmentValue = 0n;
  for (const inv of investments) {
    if (inv.units && inv.averageCost) {
      // averageCost is minor, units is numeric (can be fractional, but treating as float here for simplicity)
      // For absolute precision, we'd multiply strictly, but this is an estimate.
      investmentValue += BigInt(Math.round(Number(inv.units) * Number(inv.averageCost)));
    }
  }

  // Add active Receivables
  const receivablesResult = await dbTx
    .select({ total: sql<string>`COALESCE(SUM(${receivable.amountMinor}), 0)` })
    .from(receivable)
    .where(and(eq(receivable.workspaceId, workspaceId), inArray(receivable.status, ['open', 'partially_received'])));
  const totalReceivables = BigInt(receivablesResult[0]?.total || 0);

  // Subtract active Liabilities
  const liabilitiesResult = await dbTx
    .select({ total: sql<string>`COALESCE(SUM(${liability.amountMinor}), 0)` })
    .from(liability)
    .where(and(eq(liability.workspaceId, workspaceId), inArray(liability.status, ['open', 'partially_paid'])));
  const totalLiabilities = BigInt(liabilitiesResult[0]?.total || 0);

  return ledgerSum + investmentValue + totalReceivables - totalLiabilities;
}

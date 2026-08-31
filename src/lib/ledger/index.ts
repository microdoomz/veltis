import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  financialAccount,
  transactionLeg,
  transaction,
  heldForOther,
  accountState,
  investmentPosition,
  investmentPriceSnapshot,
  receivable,
  liability
} from '../db/schema';
import { NotFoundError } from '../services/errors';
import { receivableSettlement, liabilityPayment } from '../db/schema';

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

  // Add investments: For each position, use the latest price snapshot if available, otherwise fallback to averageCost.
  const investments = await dbTx
    .select({
      id: investmentPosition.id,
      units: investmentPosition.units,
      averageCost: investmentPosition.averageCostMinor
    })
    .from(investmentPosition)
    .where(eq(investmentPosition.workspaceId, workspaceId));
    
  let investmentValue = 0n;
  if (investments.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const positionIds = investments.map((i: any) => i.id);
    
    // Fetch all price snapshots for these positions (could be optimized with DISTINCT ON in Postgres, 
    // but SQLite doesn't have it natively, so we just order by observedAt desc and pick the first one in TS)
    // Actually, for SQLite, we can just group by positionId and max(observedAt), or simply fetch them and sort.
    const snapshots = await dbTx.query.investmentPriceSnapshot.findMany({
      where: inArray(investmentPriceSnapshot.positionId, positionIds),
      orderBy: (snapshot: any, { desc }: any) => [desc(snapshot.observedAt)],
    });

    for (const inv of investments) {
      if (inv.units) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const latestSnapshot = snapshots.find((s: any) => s.positionId === inv.id);
        const priceToUse = latestSnapshot ? latestSnapshot.priceMinor : (inv.averageCost || 0n);
        
        investmentValue += BigInt(Math.round(Number(inv.units) * Number(priceToUse)));
      }
    }
  }

  // Add outstanding Receivables
  // Outstanding = receivable.amountMinor - sum(receivableSettlement.amountMinor)
  const receivablesResult = await dbTx
    .select({
      originalAmount: receivable.amountMinor,
      settledAmount: sql<string>`COALESCE(SUM(${receivableSettlement.amountMinor}), 0)`
    })
    .from(receivable)
    .leftJoin(receivableSettlement, eq(receivableSettlement.receivableId, receivable.id))
    .where(and(eq(receivable.workspaceId, workspaceId), inArray(receivable.status, ['open', 'partially_received'])))
    .groupBy(receivable.id);

  let totalOutstandingReceivables = 0n;
  for (const r of receivablesResult) {
    totalOutstandingReceivables += BigInt(r.originalAmount) - BigInt(r.settledAmount);
  }

  // Subtract outstanding Liabilities
  // Outstanding = liability.amountMinor - sum(liabilityPayment.amountMinor)
  const liabilitiesResult = await dbTx
    .select({
      originalAmount: liability.amountMinor,
      paidAmount: sql<string>`COALESCE(SUM(${liabilityPayment.amountMinor}), 0)`
    })
    .from(liability)
    .leftJoin(liabilityPayment, eq(liabilityPayment.liabilityId, liability.id))
    .where(and(eq(liability.workspaceId, workspaceId), inArray(liability.status, ['open', 'partially_paid'])))
    .groupBy(liability.id);

  let totalOutstandingLiabilities = 0n;
  for (const l of liabilitiesResult) {
    totalOutstandingLiabilities += BigInt(l.originalAmount) - BigInt(l.paidAmount);
  }

  return ledgerSum + investmentValue + totalOutstandingReceivables - totalOutstandingLiabilities;
}

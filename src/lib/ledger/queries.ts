import { eq, desc, and, ne } from 'drizzle-orm';
import { db } from '../db';
import { transaction, financialAccount, transactionLeg, category } from '../db/schema';
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
  
  const balanceMinor = await getAccountLedgerBalance(accountId);
  return { ...account, balanceMinor };
}

export async function getAccountTransactions(accountId: string, limit: number = 50) {
  // To get transactions for an account, we query transactionLegs for that account,
  // then include the parent transaction.
  const legs = await db.query.transactionLeg.findMany({
    where: eq(transactionLeg.accountId, accountId),
    limit,
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

  // Filter out deleted/voided parent transactions and sort by date descending
  const validTxns = legs
    .filter(leg => leg.transaction && leg.transaction.status !== 'deleted' && leg.transaction.status !== 'voided')
    .map(leg => leg.transaction)
    .sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Deduplicate in case multiple legs belong to the same transaction (e.g. self transfer? highly unlikely but safe)
  const uniqueTxns = Array.from(new Map(validTxns.map(t => [t.id, t])).values());

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

export async function getRecentTransactions(workspaceId: string, limit: number = 5) {
  // We fetch transactions created in this workspace, ignoring deleted ones.
  // We need to join with transactionLeg and financialAccount to get the account name.
  // Since a transaction can have multiple legs (e.g., transfer), we'll fetch the transaction 
  // and then aggregate its legs in JS, or just fetch the primary leg for display.

  const txs = await db.query.transaction.findMany({
    where: and(
      eq(transaction.workspaceId, workspaceId),
      ne(transaction.status, 'deleted'),
      ne(transaction.status, 'voided')
    ),
    orderBy: [desc(transaction.transactionDate), desc(transaction.createdAt)],
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

  return txs;
}

export async function getAccountSummary(workspaceId: string) {
  const accounts = await db.query.financialAccount.findMany({
    where: and(
      eq(financialAccount.workspaceId, workspaceId),
      eq(financialAccount.status, 'active')
    )
  });

  // Fetch balances for each
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const balance = await getAccountLedgerBalance(acc.id);
      return {
        ...acc,
        balanceMinor: balance
      };
    })
  );

  return accountsWithBalances;
}

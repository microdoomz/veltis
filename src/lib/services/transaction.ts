import { db } from '../db';
import { transaction, transactionLeg } from '../db/schema';
import { eq } from 'drizzle-orm';
import { InvalidTransactionError } from './errors';

type BaseTransactionParams = {
  workspaceId: string;
  createdByUserId: string;
  amountMinor: bigint;
  currency: string;
  transactionDate: Date;
  description?: string;
  merchantName?: string;
  categoryId?: string;
  subcategoryId?: string;
  clientTransactionId?: string;
  source?: 'web' | 'shortcut' | 'import' | 'recurring' | 'system' | 'manual';
};

export async function createExpense(
  params: BaseTransactionParams & { accountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive for an expense.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'expense',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.accountId,
      direction: 'credit', // Credit decreases the asset account
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'expense_source'
    });

    return newTx;
  });
}

export async function createIncome(
  params: BaseTransactionParams & { accountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive for an income.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'income',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.accountId,
      direction: 'debit', // Debit increases the asset account
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'income_destination'
    });

    return newTx;
  });
}

export async function createTransfer(
  params: BaseTransactionParams & { sourceAccountId: string; destAccountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive for a transfer.');
  }
  if (params.sourceAccountId === params.destAccountId) {
    throw new InvalidTransactionError('Cannot transfer to the same account.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'transfer',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    await tx.insert(transactionLeg).values([
      {
        transactionId: newTx.id,
        accountId: params.sourceAccountId,
        direction: 'credit', // Leaves source
        amountMinor: params.amountMinor,
        currency: params.currency,
        legRole: 'transfer_source'
      },
      {
        transactionId: newTx.id,
        accountId: params.destAccountId,
        direction: 'debit', // Enters destination
        amountMinor: params.amountMinor,
        currency: params.currency,
        legRole: 'transfer_destination'
      }
    ]);

    return newTx;
  });
}

export async function createCreditCardPurchase(
  params: BaseTransactionParams & { creditCardAccountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive for a credit card purchase.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'credit_card_purchase',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.creditCardAccountId,
      direction: 'credit', // Credit increases a liability account (debt grows)
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'cc_purchase'
    });

    return newTx;
  });
}

export async function softDeleteTransaction(transactionId: string) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx.update(transaction)
      .set({ 
        status: 'deleted',
        deletedAt: new Date()
      })
      .where(eq(transaction.id, transactionId))
      .returning();
      
    return updated;
  });
}

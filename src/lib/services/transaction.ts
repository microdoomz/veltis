import { db } from '../db';
import { transaction, transactionLeg } from '../db/schema';
import { eq, and } from 'drizzle-orm';
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

function formatTxnDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      transactionDate: formatTxnDate(params.transactionDate),
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
      transactionDate: formatTxnDate(params.transactionDate),
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
      transactionDate: formatTxnDate(params.transactionDate),
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

export async function createReceivableTransaction(
  params: BaseTransactionParams & { sourceAccountId?: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'receivable_create',
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

    // Debit leg: increases receivable asset (no accountId)
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      direction: 'debit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'receivable_asset'
    });

    if (params.sourceAccountId) {
      // Credit leg: decreases source account (e.g. loaning money out of bank)
      await tx.insert(transactionLeg).values({
        transactionId: newTx.id,
        accountId: params.sourceAccountId,
        direction: 'credit',
        amountMinor: params.amountMinor,
        currency: params.currency,
        legRole: 'receivable_source'
      });
    }

    return newTx;
  });
}

export async function settleReceivableTransaction(
  params: BaseTransactionParams & { destAccountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'receivable_receive',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    // Debit leg: increases destination bank account
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.destAccountId,
      direction: 'debit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'receivable_destination'
    });

    // Credit leg: decreases receivable asset (no accountId)
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      direction: 'credit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'receivable_asset_reduction'
    });

    return newTx;
  });
}

export async function createLiabilityTransaction(
  params: BaseTransactionParams & { destAccountId?: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'liability_create',
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

    // Credit leg: increases liability (no accountId)
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      direction: 'credit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'liability'
    });

    if (params.destAccountId) {
      // Debit leg: increases destination account (e.g. receiving a loan into bank)
      await tx.insert(transactionLeg).values({
        transactionId: newTx.id,
        accountId: params.destAccountId,
        direction: 'debit',
        amountMinor: params.amountMinor,
        currency: params.currency,
        legRole: 'liability_destination'
      });
    }

    return newTx;
  });
}

export async function payLiabilityTransaction(
  params: BaseTransactionParams & { sourceAccountId: string }
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive.');
  }

  return await db.transaction(async (tx) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'liability_payment',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description,
      merchantName: params.merchantName,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'manual'
    }).returning();

    // Debit leg: decreases liability (no accountId)
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      direction: 'debit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'liability_reduction'
    });

    // Credit leg: decreases source bank account
    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.sourceAccountId,
      direction: 'credit',
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'liability_payment_source'
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

export async function createAdjustmentTransaction(
  params: BaseTransactionParams & { accountId: string; adjustmentDirection: 'increase' | 'decrease' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTx: any = db
) {
  if (params.amountMinor < 0n) {
    throw new InvalidTransactionError('Amount must be positive.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await dbTx.transaction(async (tx: any) => {
    const [newTx] = await tx.insert(transaction).values({
      workspaceId: params.workspaceId,
      createdByUserId: params.createdByUserId,
      transactionType: 'adjustment',
      status: 'active',
      amountMinor: params.amountMinor,
      currency: params.currency,
      transactionDate: params.transactionDate.toISOString().split('T')[0],
      description: params.description || 'Reconciliation Adjustment',
      merchantName: params.merchantName,
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      clientTransactionId: params.clientTransactionId,
      source: params.source || 'system'
    }).returning();

    // Debit increases an asset account, credit decreases it.
    // Assuming reconciliation adjustments are mostly for asset accounts for now.
    // If it's a liability account (like credit card), an increase in balance means debit (less debt) or credit (more debt)?
    // For reconciliation, "actual balance" higher than calculated usually means we need to increase the balance.
    // Let's assume standard asset direction: debit = increase, credit = decrease.
    const direction = params.adjustmentDirection === 'increase' ? 'debit' : 'credit';

    await tx.insert(transactionLeg).values({
      transactionId: newTx.id,
      accountId: params.accountId,
      direction,
      amountMinor: params.amountMinor,
      currency: params.currency,
      legRole: 'reconciliation_adjustment'
    });

    return newTx;
  });
}

export async function updateTransaction(params: {
  transactionId: string;
  workspaceId: string;
  description?: string;
  merchantName?: string;
  categoryId?: string | null;
  amountMinor?: bigint;
  transactionDate?: Date;
  accountId?: string;
}) {
  return await db.transaction(async (tx) => {
    const existing = await tx.query.transaction.findFirst({
      where: and(
        eq(transaction.id, params.transactionId),
        eq(transaction.workspaceId, params.workspaceId)
      ),
    });

    if (!existing) {
      throw new Error('Transaction not found or unauthorized');
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (params.description !== undefined) updates.description = params.description;
    if (params.merchantName !== undefined) updates.merchantName = params.merchantName;
    if (params.categoryId !== undefined) updates.categoryId = params.categoryId;
    if (params.transactionDate !== undefined) {
      updates.transactionDate = params.transactionDate.toISOString().split('T')[0];
    }
    if (params.amountMinor !== undefined) {
      if (params.amountMinor <= 0n) {
        throw new InvalidTransactionError('Amount must be positive.');
      }
      updates.amountMinor = params.amountMinor;
    }

    const [updated] = await tx
      .update(transaction)
      .set(updates)
      .where(eq(transaction.id, params.transactionId))
      .returning();

    // If amount changed, update amount on all legs to keep balanced
    if (params.amountMinor !== undefined) {
      await tx
        .update(transactionLeg)
        .set({ amountMinor: params.amountMinor })
        .where(eq(transactionLeg.transactionId, params.transactionId));
    }

    // If account changed, update primary account leg
    if (params.accountId) {
      const legs = await tx.query.transactionLeg.findMany({
        where: eq(transactionLeg.transactionId, params.transactionId),
      });
      const accountLeg = legs.find((l) => l.accountId !== null);
      if (accountLeg) {
        await tx
          .update(transactionLeg)
          .set({ accountId: params.accountId })
          .where(eq(transactionLeg.id, accountLeg.id));
      }
    }

    return updated;
  });
}

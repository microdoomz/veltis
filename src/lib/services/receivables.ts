import { db } from '../db';
import { receivable, receivableSettlement } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createReceivableTransaction, settleReceivableTransaction } from './transaction';
import { NotFoundError, InvalidTransactionError } from './errors';

export const createReceivableSchema = z.object({
  workspaceId: z.string().uuid(),
  counterpartyName: z.string().min(1),
  amountMinor: z.bigint().min(1n),
  currency: z.string().length(3),
  createdDate: z.date(),
  expectedDate: z.date().optional(),
  note: z.string().optional(),
  sourceAccountId: z.string().uuid().optional(),
  createdByUserId: z.string().min(1),
});

export async function createReceivable(data: z.infer<typeof createReceivableSchema>) {
  return await db.transaction(async (tx) => {
    // 1. Create the Receivable record
    const [newReceivable] = await tx.insert(receivable).values({
      workspaceId: data.workspaceId,
      counterpartyName: data.counterpartyName,
      amountMinor: data.amountMinor,
      currency: data.currency,
      createdDate: data.createdDate.toISOString().split('T')[0],
      expectedDate: data.expectedDate ? data.expectedDate.toISOString().split('T')[0] : null,
      status: 'open',
      note: data.note,
    }).returning();

    // 2. Create the associated ledger transaction
    await createReceivableTransaction({
      workspaceId: data.workspaceId,
      createdByUserId: data.createdByUserId,
      amountMinor: data.amountMinor,
      currency: data.currency,
      transactionDate: data.createdDate,
      description: `Receivable from ${data.counterpartyName}`,
      merchantName: data.counterpartyName,
      sourceAccountId: data.sourceAccountId,
      source: 'manual',
    });

    return newReceivable;
  });
}

export const settleReceivableSchema = z.object({
  receivableId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  destAccountId: z.string().uuid(),
  amountMinor: z.bigint().min(1n),
  settledAt: z.date(),
  createdByUserId: z.string().min(1),
});

export async function settleReceivable(data: z.infer<typeof settleReceivableSchema>) {
  return await db.transaction(async (tx) => {
    // 1. Fetch existing receivable
    const existing = await tx.query.receivable.findFirst({
      where: eq(receivable.id, data.receivableId)
    });
    
    if (!existing || existing.workspaceId !== data.workspaceId) {
      throw new NotFoundError("Receivable not found");
    }

    if (existing.status === 'received' || existing.status === 'cancelled') {
      throw new InvalidTransactionError("Receivable is already settled or cancelled.");
    }

    // 2. Create ledger transaction for receiving the money
    const txn = await settleReceivableTransaction({
      workspaceId: data.workspaceId,
      createdByUserId: data.createdByUserId,
      amountMinor: data.amountMinor,
      currency: existing.currency,
      transactionDate: data.settledAt,
      description: `Settlement from ${existing.counterpartyName}`,
      merchantName: existing.counterpartyName,
      destAccountId: data.destAccountId,
      source: 'manual',
    });

    // 3. Record the settlement
    await tx.insert(receivableSettlement).values({
      receivableId: existing.id,
      transactionId: txn.id,
      amountMinor: data.amountMinor,
      settledAt: data.settledAt,
    });

    // 4. Update the receivable status
    const allSettlements = await tx.query.receivableSettlement.findMany({
      where: eq(receivableSettlement.receivableId, existing.id)
    });
    
    const totalSettled = allSettlements.reduce((sum, s) => sum + BigInt(s.amountMinor), 0n) + data.amountMinor;
    
    let newStatus: 'open' | 'partially_received' | 'received' | 'cancelled' = 'partially_received';
    if (totalSettled >= BigInt(existing.amountMinor)) {
      newStatus = 'received';
    }

    const [updated] = await tx.update(receivable).set({
      status: newStatus,
      updatedAt: new Date()
    }).where(eq(receivable.id, existing.id)).returning();

    return updated;
  });
}

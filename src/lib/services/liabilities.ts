import { db } from '../db';
import { liability, liabilityPayment } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createLiabilityTransaction, payLiabilityTransaction } from './transaction';
import { NotFoundError, InvalidTransactionError } from './errors';

export const createLiabilitySchema = z.object({
  workspaceId: z.string().uuid(),
  counterpartyName: z.string().min(1),
  liabilityType: z.enum(['person', 'bank', 'credit_card', 'other']),
  amountMinor: z.bigint().min(1n),
  currency: z.string().length(3),
  createdDate: z.date(),
  dueDate: z.date().optional(),
  note: z.string().optional(),
  destAccountId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid(),
});

export async function createLiability(data: z.infer<typeof createLiabilitySchema>) {
  return await db.transaction(async (tx) => {
    // 1. Create the Liability record
    const [newLiability] = await tx.insert(liability).values({
      workspaceId: data.workspaceId,
      counterpartyName: data.counterpartyName,
      liabilityType: data.liabilityType,
      amountMinor: data.amountMinor,
      currency: data.currency,
      createdDate: data.createdDate.toISOString().split('T')[0],
      dueDate: data.dueDate ? data.dueDate.toISOString().split('T')[0] : null,
      status: 'open',
      note: data.note,
    }).returning();

    // 2. Create the associated ledger transaction
    await createLiabilityTransaction({
      workspaceId: data.workspaceId,
      createdByUserId: data.createdByUserId,
      amountMinor: data.amountMinor,
      currency: data.currency,
      transactionDate: data.createdDate,
      description: `Liability to ${data.counterpartyName}`,
      merchantName: data.counterpartyName,
      destAccountId: data.destAccountId,
      source: 'manual',
    });

    return newLiability;
  });
}

export const payLiabilitySchema = z.object({
  liabilityId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sourceAccountId: z.string().uuid(),
  amountMinor: z.bigint().min(1n),
  paidAt: z.date(),
  createdByUserId: z.string().uuid(),
});

export async function payLiability(data: z.infer<typeof payLiabilitySchema>) {
  return await db.transaction(async (tx) => {
    // 1. Fetch existing liability
    const existing = await tx.query.liability.findFirst({
      where: eq(liability.id, data.liabilityId)
    });
    
    if (!existing || existing.workspaceId !== data.workspaceId) {
      throw new NotFoundError("Liability not found");
    }

    if (existing.status === 'paid' || existing.status === 'cancelled') {
      throw new InvalidTransactionError("Liability is already paid or cancelled.");
    }

    // 2. Create ledger transaction for paying the money
    const txn = await payLiabilityTransaction({
      workspaceId: data.workspaceId,
      createdByUserId: data.createdByUserId,
      amountMinor: data.amountMinor,
      currency: existing.currency,
      transactionDate: data.paidAt,
      description: `Payment to ${existing.counterpartyName}`,
      merchantName: existing.counterpartyName,
      sourceAccountId: data.sourceAccountId,
      source: 'manual',
    });

    // 3. Record the payment
    await tx.insert(liabilityPayment).values({
      liabilityId: existing.id,
      transactionId: txn.id,
      amountMinor: data.amountMinor,
      paidAt: data.paidAt,
    });

    // 4. Update the liability status
    const allPayments = await tx.query.liabilityPayment.findMany({
      where: eq(liabilityPayment.liabilityId, existing.id)
    });
    
    const totalPaid = allPayments.reduce((sum, p) => sum + BigInt(p.amountMinor), 0n) + data.amountMinor;
    
    let newStatus: 'open' | 'partially_paid' | 'paid' | 'cancelled' = 'partially_paid';
    if (totalPaid >= BigInt(existing.amountMinor)) {
      newStatus = 'paid';
    }

    const [updated] = await tx.update(liability).set({
      status: newStatus,
      updatedAt: new Date()
    }).where(eq(liability.id, existing.id)).returning();

    return updated;
  });
}

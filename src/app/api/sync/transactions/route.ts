import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';
import { createExpense, createIncome, createTransfer } from '@/lib/services/transaction';
import { z } from 'zod';

const syncItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['expense', 'income', 'transfer']),
  payload: z.any()
});

const syncRequestSchema = z.object({
  transactions: z.array(syncItemSchema)
});

const baseSchema = z.object({
  amountMajor: z.coerce.number().positive("Amount must be positive"),
  accountId: z.string().min(1, "Account is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

const transferSchema = z.object({
  amountMajor: z.coerce.number().positive("Amount must be positive"),
  sourceAccountId: z.string().min(1, "Source account is required"),
  destAccountId: z.string().min(1, "Destination account is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const userContext = await requireUser();
    
    const body = await req.json();
    const parsed = syncRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid sync payload structure', details: parsed.error }, { status: 400 });
    }

    const results = [];

    for (const item of parsed.data.transactions) {
      try {
        // 1. Check idempotency (ambiguous timeout-after-commit protection)
        const existing = await checkIdempotency(authContext.workspaceId, 'offline_sync', item.id);
        
        if (existing) {
          results.push({ id: item.id, status: 'success' });
          continue;
        }

        // 2. Validate payload and process
        if (item.type === 'expense' || item.type === 'income') {
          const validPayload = baseSchema.parse(item.payload);
          const amountMinor = BigInt(Math.round(validPayload.amountMajor * 100));
          
          if (item.type === 'expense') {
            await createExpense({
              workspaceId: authContext.workspaceId,
              createdByUserId: userContext.user.id,
              amountMinor,
              currency: "INR",
              transactionDate: new Date(validPayload.transactionDate),
              description: validPayload.description,
              categoryId: validPayload.categoryId,
              accountId: validPayload.accountId,
              clientTransactionId: item.id
            });
          } else {
            await createIncome({
              workspaceId: authContext.workspaceId,
              createdByUserId: userContext.user.id,
              amountMinor,
              currency: "INR",
              transactionDate: new Date(validPayload.transactionDate),
              description: validPayload.description,
              categoryId: validPayload.categoryId,
              accountId: validPayload.accountId,
              clientTransactionId: item.id
            });
          }
        } else if (item.type === 'transfer') {
          const validPayload = transferSchema.parse(item.payload);
          const amountMinor = BigInt(Math.round(validPayload.amountMajor * 100));
          
          await createTransfer({
            workspaceId: authContext.workspaceId,
            createdByUserId: userContext.user.id,
            amountMinor,
            currency: "INR",
            transactionDate: new Date(validPayload.transactionDate),
            description: validPayload.description,
            sourceAccountId: validPayload.sourceAccountId,
            destAccountId: validPayload.destAccountId,
            clientTransactionId: item.id
          });
        }

        // 3. Record idempotency
        await recordIdempotency(
          authContext.workspaceId, 
          'offline_sync', 
          item.id, 
          { success: true }, 
          'transaction', 
          item.id // We use client_transaction_id as resourceId
        );

        results.push({ id: item.id, status: 'success' });
      } catch (err) {
        if (err instanceof z.ZodError || (err instanceof Error && (err.message.includes('Validation') || err.message.includes('not found')))) {
          results.push({ id: item.id, status: 'permanent_error', error: err instanceof Error ? err.message : 'Validation failed' });
        } else {
          // Transient error: fail the whole batch so the client retries
          // Idempotency will protect successful ones
          throw err;
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

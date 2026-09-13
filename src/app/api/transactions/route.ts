import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { getRecentTransactions, TransactionFilters } from '@/lib/ledger/queries';
import { createExpense, createIncome, createTransfer } from '@/lib/services/transaction';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';
import { db } from '@/lib/db';
import { financialAccount } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWorkspaceId = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWorkspaceId);
    const workspaceId = authContext.workspaceId;

    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 500);

    const filters: TransactionFilters = {
      categoryId: url.searchParams.get('categoryId') || undefined,
      accountId: url.searchParams.get('accountId') || undefined,
      flowType: (url.searchParams.get('type') as 'all' | 'income' | 'expense' | 'transfer') || undefined,
      source: (url.searchParams.get('source') as 'all' | 'web' | 'shortcut' | 'import') || undefined,
      sortBy: (url.searchParams.get('sort') as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };

    const txns = await getRecentTransactions(workspaceId, limit, filters);

    const serialized = txns.map((t) => ({
      ...t,
      amountMinor: Number(t.amountMinor),
      transactionDate: t.transactionDate.toString(),
    }));

    return NextResponse.json({ transactions: serialized }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Transactions GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

const createTxnSchema = z.object({
  workspaceId: z.string().nullish().transform(v => (!v || v.trim() === '' ? undefined : v.trim())),
  type: z.enum(['expense', 'income', 'transfer']).default('expense'),
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().optional(),
  sourceAccountId: z.string().optional(),
  destAccountId: z.string().optional(),
  description: z.string().nullish().transform(v => v?.trim() || ''),
  merchantName: z.string().nullish().transform(v => v?.trim() || undefined),
  categoryId: z.string().nullish().transform(v => (!v || v.trim() === '' ? undefined : v.trim())),
  date: z.string().nullish(),
  currency: z.string().nullish().transform(v => (!v || v.trim().length !== 3 ? undefined : v.trim().toUpperCase())),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createTxnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400, headers: corsHeaders });
    }

    const data = parsed.data;
    const authContext = await requireStrictWorkspaceAccess(data.workspaceId || (await requireWorkspaceAccess()).workspaceId);
    const workspaceId = authContext.workspaceId;
    const userId = authContext.session.user.id;

    const idempotencyKey = data.idempotencyKey || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Idempotency check
    const existing = await checkIdempotency(workspaceId, 'transaction_create', idempotencyKey);
    if (existing) {
      return NextResponse.json(existing.responsePayload, { status: 200, headers: corsHeaders });
    }

    const amountMinor = BigInt(Math.round(data.amount * 100));
    const transactionDate = data.date && !isNaN(new Date(data.date).getTime()) ? new Date(data.date) : new Date();

    let createdTxn;

    if (data.type === 'transfer') {
      const srcId = data.sourceAccountId || data.accountId;
      const dstId = data.destAccountId;
      if (!srcId || !dstId) {
        return NextResponse.json({ error: 'Source and destination accounts are required for transfer.' }, { status: 400, headers: corsHeaders });
      }

      let currency = data.currency?.toUpperCase();
      if (!currency) {
        const acc = await db.query.financialAccount.findFirst({ where: eq(financialAccount.id, srcId) });
        currency = acc?.currency || 'USD';
      }

      createdTxn = await createTransfer({
        workspaceId,
        createdByUserId: userId,
        amountMinor,
        currency,
        transactionDate,
        description: data.description || 'Transfer',
        sourceAccountId: srcId,
        destAccountId: dstId,
        source: 'manual',
      });
    } else {
      const accId = data.accountId;
      if (!accId) {
        return NextResponse.json({ error: 'Account is required.' }, { status: 400, headers: corsHeaders });
      }

      let currency = data.currency?.toUpperCase();
      if (!currency) {
        const acc = await db.query.financialAccount.findFirst({ where: eq(financialAccount.id, accId) });
        currency = acc?.currency || 'USD';
      }

      if (data.type === 'expense') {
        createdTxn = await createExpense({
          workspaceId,
          createdByUserId: userId,
          amountMinor,
          currency,
          transactionDate,
          description: data.description || 'Expense',
          merchantName: data.merchantName || data.description || 'Expense',
          accountId: accId,
          categoryId: data.categoryId || undefined,
          source: 'manual',
        });
      } else {
        createdTxn = await createIncome({
          workspaceId,
          createdByUserId: userId,
          amountMinor,
          currency,
          transactionDate,
          description: data.description || 'Income',
          merchantName: data.merchantName || data.description || 'Income',
          accountId: accId,
          categoryId: data.categoryId || undefined,
          source: 'manual',
        });
      }
    }

    const responsePayload = {
      success: true,
      transaction: {
        ...createdTxn,
        amountMinor: Number(createdTxn.amountMinor),
        transactionDate: createdTxn.transactionDate.toString(),
      }
    };

    await recordIdempotency(workspaceId, 'transaction_create', idempotencyKey, responsePayload, 'transaction', createdTxn.id);

    try {
      revalidatePath('/(app)', 'layout');
      revalidatePath('/home');
      revalidatePath('/transactions');
      revalidatePath('/accounts');
      revalidatePath('/analytics');
    } catch (e) {
      console.warn('Cache revalidation error in create transaction:', e);
    }

    return NextResponse.json(responsePayload, { status: 201, headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

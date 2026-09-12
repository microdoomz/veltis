import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getTransactionById } from '@/lib/ledger/queries';
import { softDeleteTransaction, updateTransaction } from '@/lib/services/transaction';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authContext = await requireWorkspaceAccess();
    const txn = await getTransactionById(authContext.workspaceId, id);

    if (!txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({
      transaction: {
        ...txn,
        amountMinor: Number(txn.amountMinor),
        transactionDate: txn.transactionDate.toString(),
      }
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

const patchTxnSchema = z.object({
  description: z.string().optional(),
  merchantName: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  date: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  accountId: z.string().optional(),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authContext = await requireWorkspaceAccess();
    const body = await req.json();
    const parsed = patchTxnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400, headers: corsHeaders });
    }

    const data = parsed.data;
    const amountMinor = data.amount ? BigInt(Math.round(data.amount * 100)) : undefined;
    const transactionDate = data.date && !isNaN(new Date(data.date).getTime()) ? new Date(data.date) : undefined;

    const updated = await updateTransaction({
      transactionId: id,
      workspaceId: authContext.workspaceId,
      description: data.description?.trim(),
      merchantName: data.merchantName?.trim(),
      categoryId: data.categoryId,
      amountMinor,
      transactionDate,
      accountId: data.accountId,
    });

    return NextResponse.json({
      success: true,
      transaction: {
        ...updated,
        amountMinor: Number(updated.amountMinor),
        transactionDate: updated.transactionDate.toString(),
      }
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const authContext = await requireWorkspaceAccess();
    const txn = await getTransactionById(authContext.workspaceId, id);

    if (!txn) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404, headers: corsHeaders });
    }

    await softDeleteTransaction(id);

    return NextResponse.json({ success: true, message: 'Transaction deleted' }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

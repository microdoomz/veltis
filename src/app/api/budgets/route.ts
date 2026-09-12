import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getBudgetsWithActuals } from '@/lib/ledger/budget';
import { createBudget } from '@/lib/services/budget';
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
    const budgets = await getBudgetsWithActuals(authContext.workspaceId);

    const serialized = budgets.map((b) => ({
      ...b,
      amountMinor: Number(b.amountMinor),
      spentMinor: Number(b.spentMinor),
      remainingMinor: Number(b.remainingMinor),
    }));

    return NextResponse.json({ budgets: serialized }, { headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

const postBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('USD'),
  periodStartDate: z.string(),
  periodEndDate: z.string(),
});

export async function POST(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const body = await req.json();
    const parsed = postBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400, headers: corsHeaders });
    }

    const data = parsed.data;
    const amountMinor = BigInt(Math.round(data.amount * 100));

    const newBudget = await createBudget({
      workspaceId: authContext.workspaceId,
      categoryId: data.categoryId,
      amountMinor,
      currency: data.currency.toUpperCase(),
      periodStartDate: data.periodStartDate,
      periodEndDate: data.periodEndDate,
    });

    return NextResponse.json({
      success: true,
      budget: {
        ...newBudget,
        amountMinor: Number(newBudget.amountMinor),
      }
    }, { status: 201, headers: corsHeaders });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

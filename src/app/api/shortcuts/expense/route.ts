import { NextRequest, NextResponse } from 'next/server';
import { verifyShortcutToken } from '@/lib/services/shortcut';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createExpense } from '@/lib/services/transaction';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { financialAccount } from '@/lib/db/schema';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Connection': 'keep-alive',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

const shortcutExpenseSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]+/g, '');
      return parseFloat(cleaned);
    }
    return val;
  }).refine((val) => !isNaN(val) && val > 0, {
    message: 'Amount must be a positive number greater than 0',
  }),
  description: z.string().optional().transform((v) => v?.trim() || 'Shortcut Expense'),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  currency: z.string().length(3).optional(),
  date: z.string().optional(), // YYYY-MM-DD
  idempotencyKey: z.string().optional().transform((v) => v?.trim() || `sh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth extraction - resilient to both "Bearer token" and raw token
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Please pass your token in the Authorization header.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const shortcut = await verifyShortcutToken(token);
    if (!shortcut) {
      return NextResponse.json(
        { error: 'Invalid or revoked token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const rateLimit = await checkRateLimit(`shortcut:token:${shortcut.id}`, 30, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: corsHeaders }
      );
    }

    // 2. Read request body safely
    let rawBody = '';
    try {
      rawBody = await req.text();
    } catch {
      // Body reading stream error fallback
    }

    let parsedJson: Record<string, unknown> = {};
    if (rawBody && rawBody.trim()) {
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON body in request payload.' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const parseResult = shortcutExpenseSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: parseResult.error.format(),
          hint: 'Ensure amount is a positive number (e.g. 25.50) and body is valid JSON.'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const data = parseResult.data;

    // 3. Check Idempotency
    const existing = await checkIdempotency(shortcut.workspaceId, 'shortcut_expense', data.idempotencyKey);
    if (existing) {
      return NextResponse.json(existing.responsePayload, { status: 200, headers: corsHeaders });
    }

    // 4. Resolve Account
    let targetAccountId = data.accountId;
    let targetAccountCurrency = 'USD';
    if (!targetAccountId) {
      // Find a default account if not provided (first active bank or credit or wallet account)
      const accounts = await db.query.financialAccount.findMany({
        where: and(
          eq(financialAccount.workspaceId, shortcut.workspaceId),
          eq(financialAccount.status, 'active')
        ),
        limit: 1,
      });
      if (accounts.length === 0) {
        return NextResponse.json(
          { error: 'No active accounts found in workspace. Please add an account first.' },
          { status: 400, headers: corsHeaders }
        );
      }
      targetAccountId = accounts[0].id;
      targetAccountCurrency = accounts[0].currency;
    } else {
      // Validate requested account belongs to workspace
      const account = await db.query.financialAccount.findFirst({
        where: and(
          eq(financialAccount.id, targetAccountId),
          eq(financialAccount.workspaceId, shortcut.workspaceId)
        ),
      });
      if (!account) {
        return NextResponse.json(
          { error: 'Account not found or not in workspace' },
          { status: 404, headers: corsHeaders }
        );
      }
      targetAccountCurrency = account.currency;
    }

    const txnCurrency = (data.currency || targetAccountCurrency).toUpperCase();

    // 5. Create Transaction (Domain Logic)
    const amountMinor = BigInt(Math.round(data.amount * 100));
    const transactionDate = data.date ? new Date(data.date) : new Date();

    const txn = await createExpense({
      workspaceId: shortcut.workspaceId,
      amountMinor,
      currency: txnCurrency,
      transactionDate,
      accountId: targetAccountId,
      categoryId: data.categoryId,
      merchantName: data.description,
      source: 'shortcut',
      createdByUserId: shortcut.createdByUserId,
    });

    // 6. Response Payload
    const responsePayload = {
      success: true,
      transactionId: txn.id,
      amount: data.amount,
      currency: txnCurrency,
      description: data.description,
      date: transactionDate.toISOString().split('T')[0],
    };

    // 7. Record Idempotency
    await recordIdempotency(
      shortcut.workspaceId,
      'shortcut_expense',
      data.idempotencyKey,
      responsePayload,
      'transaction',
      txn.id
    );

    return NextResponse.json(responsePayload, { status: 201, headers: corsHeaders });
  } catch (error: unknown) {
    console.error('Shortcut API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

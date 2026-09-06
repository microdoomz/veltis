import { NextRequest, NextResponse } from 'next/server';
import { verifyShortcutToken } from '@/lib/services/shortcut';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createIncome } from '@/lib/services/transaction';
import { db } from '@/lib/db';
import { eq, and, ne, sql } from 'drizzle-orm';
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

const shortcutIncomeSchema = z.object({
  amount: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]+/g, '');
      return parseFloat(cleaned);
    }
    return val;
  }).refine((val) => !isNaN(val) && val > 0, {
    message: 'Amount must be a positive number greater than 0',
  }),
  description: z.string().optional().transform((v) => v?.trim() || 'Shortcut Income'),
  accountId: z.string().optional(),
  account: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  currency: z.string().length(3).optional(),
  date: z.string().optional(), // YYYY-MM-DD
  idempotencyKey: z.string().optional().transform((v) => v?.trim() || `sh_inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
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
      // Body reading fallback
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

    const parseResult = shortcutIncomeSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.format(),
          hint: 'Ensure amount is a positive number and body is valid JSON.',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const data = parseResult.data;

    // 3. Idempotency Check
    const existing = await checkIdempotency(
      shortcut.workspaceId,
      'shortcut_income',
      data.idempotencyKey
    );

    if (existing) {
      return NextResponse.json(existing.responsePayload, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 4. Resolve Target Account
    const accountIdentifier = (data.accountId || data.account)?.trim();
    let targetAccountId = '';
    let targetAccountCurrency = 'INR';

    if (!accountIdentifier) {
      const firstAccount = await db.query.financialAccount.findFirst({
        where: and(
          eq(financialAccount.workspaceId, shortcut.workspaceId),
          ne(financialAccount.accountType, 'investment'),
          ne(financialAccount.status, 'archived')
        ),
      });

      if (!firstAccount) {
        return NextResponse.json(
          { error: 'No active bank or cash account found in this workspace to record income into.' },
          { status: 400, headers: corsHeaders }
        );
      }

      targetAccountId = firstAccount.id;
      targetAccountCurrency = firstAccount.currency;
    } else {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountIdentifier);

      const account = isUuid
        ? await db.query.financialAccount.findFirst({
            where: and(
              eq(financialAccount.id, accountIdentifier),
              eq(financialAccount.workspaceId, shortcut.workspaceId),
              ne(financialAccount.status, 'archived')
            ),
          })
        : await db.query.financialAccount.findFirst({
            where: and(
              eq(financialAccount.workspaceId, shortcut.workspaceId),
              sql`LOWER(${financialAccount.name}) LIKE LOWER(${'%' + accountIdentifier + '%'})`
            ),
          });

      if (!account) {
        return NextResponse.json(
          { error: `Account '${accountIdentifier}' not found in your workspace.` },
          { status: 404, headers: corsHeaders }
        );
      }

      targetAccountId = account.id;
      targetAccountCurrency = account.currency;
    }

    const txnCurrency = (data.currency || targetAccountCurrency).toUpperCase();

    // 5. Create Income Transaction
    const amountMinor = BigInt(Math.round(data.amount * 100));
    const transactionDate = data.date ? new Date(data.date) : new Date();

    const txn = await createIncome({
      workspaceId: shortcut.workspaceId,
      amountMinor,
      currency: txnCurrency,
      transactionDate,
      accountId: targetAccountId,
      categoryId: data.categoryId,
      description: data.description,
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
      accountId: targetAccountId,
    };

    await recordIdempotency(
      shortcut.workspaceId,
      'shortcut_income',
      data.idempotencyKey,
      responsePayload,
      'transaction',
      txn.id
    );

    return NextResponse.json(responsePayload, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    console.error('Shortcut Income API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error processing shortcut income' },
      { status: 500, headers: corsHeaders }
    );
  }
}

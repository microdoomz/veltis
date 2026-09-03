import { NextRequest, NextResponse } from 'next/server';
import { verifyShortcutToken } from '@/lib/services/shortcut';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createExpense } from '@/lib/services/transaction';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { financialAccount } from '@/lib/db/schema';
import { z } from 'zod';

const shortcutExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  idempotencyKey: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth extraction
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const shortcut = await verifyShortcutToken(token);
    if (!shortcut) {
      return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`shortcut:token:${shortcut.id}`, 20, 60);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    // 2. Parse request payload
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parseResult = shortcutExpenseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }
    const data = parseResult.data;

    // 3. Check Idempotency
    const existing = await checkIdempotency(shortcut.workspaceId, 'shortcut_expense', data.idempotencyKey);
    if (existing) {
      return NextResponse.json(existing.responsePayload, { status: 200 }); // Return cached response
    }

    // 4. Resolve Account
    let targetAccountId = data.accountId;
    if (!targetAccountId) {
      // Find a default account if not provided (just pick the first active bank/credit account)
      const accounts = await db.query.financialAccount.findMany({
        where: and(
          eq(financialAccount.workspaceId, shortcut.workspaceId),
          eq(financialAccount.status, 'active')
        ),
        limit: 1
      });
      if (accounts.length === 0) {
        return NextResponse.json({ error: 'No active accounts found in workspace' }, { status: 400 });
      }
      targetAccountId = accounts[0].id;
    } else {
      // Validate requested account belongs to workspace
      const account = await db.query.financialAccount.findFirst({
        where: and(
          eq(financialAccount.id, targetAccountId),
          eq(financialAccount.workspaceId, shortcut.workspaceId)
        )
      });
      if (!account) {
        return NextResponse.json({ error: 'Account not found or not in workspace' }, { status: 404 });
      }
    }

    // 5. Create Transaction (Domain Logic)
    const amountMinor = BigInt(Math.round(data.amount * 100)); // USD simplified
    const transactionDate = data.date ? new Date(data.date) : new Date();

    const txn = await createExpense({
      workspaceId: shortcut.workspaceId,
      amountMinor,
      currency: 'USD',
      transactionDate,
      accountId: targetAccountId,
      categoryId: data.categoryId,
      merchantName: data.description,
      source: 'shortcut',
      createdByUserId: shortcut.createdByUserId
    });

    // 6. Response Payload
    const responsePayload = {
      success: true,
      transactionId: txn.id,
      amount: data.amount,
      description: data.description,
      status: 'created'
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

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: unknown) {
    console.error('Shortcut API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

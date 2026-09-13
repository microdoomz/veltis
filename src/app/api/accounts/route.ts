import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { createAccount } from '@/lib/services/account';
import { getAccountSummary } from '@/lib/ledger/queries';
import { safeJsonResponse, safeSerialize } from '@/lib/utils/serialization';
import { db } from '@/lib/db';
import { workspace, investmentPosition, investmentPriceSnapshot, recurringItem } from '@/lib/db/schema';
import { createRecurringItem } from '@/lib/services/recurring';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, x-session-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const postAccountSchema = z.object({
  workspaceId: z.string().nullish().transform(v => (!v || v.trim() === '' ? undefined : v.trim())),
  name: z.string().min(1, 'Account name is required'),
  type: z.string().optional(),
  accountType: z.string().optional(),
  institutionName: z.string().optional().nullable(),
  currency: z.string().nullish().transform(v => (!v || v.trim().length !== 3 ? 'USD' : v.trim().toUpperCase())),
  balance: z.union([z.number(), z.string()]).nullish().transform(v => (v !== null && v !== undefined && v !== '' ? Number(v) : undefined)),
  openingBalanceMinor: z.union([z.bigint(), z.string(), z.number()]).optional(),
  color: z.string().optional().nullable(),
  iconKey: z.string().optional().nullable(),
  updateBaseCurrency: z.boolean().optional(),
  // Investment-specific parameters
  symbol: z.string().optional().nullable(),
  units: z.union([z.string(), z.number()]).optional().nullable(),
  currentPrice: z.coerce.number().optional().nullable(),
  sipMonthlyAmount: z.coerce.number().optional().nullable(),
  sipMonthlyDay: z.coerce.number().min(1).max(31).optional().nullable(),
});

function normalizeAccountType(rawType?: string): 'bank' | 'cash_wallet' | 'digital_wallet' | 'investment' | 'credit_card' {
  if (!rawType) return 'bank';
  const lower = rawType.toLowerCase();
  if (['bank', 'checking', 'savings', 'current', 'depository_checking', 'depository_savings'].includes(lower) || lower.includes('depository') || lower.includes('check') || lower.includes('sav')) return 'bank';
  if (['credit', 'credit_card', 'card'].includes(lower)) return 'credit_card';
  if (['digital_wallet', 'wallet', 'paypal', 'venmo'].includes(lower)) return 'digital_wallet';
  if (['cash', 'cash_wallet'].includes(lower)) return 'cash_wallet';
  if (['investment', 'brokerage', 'stocks', 'investment_brokerage'].includes(lower) || lower.includes('invest') || lower.includes('broker')) return 'investment';
  return 'bank';
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWorkspaceId = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWorkspaceId);

    const accounts = await getAccountSummary(authContext.workspaceId);

    const serialized = accounts.map((acc) => {
      const balMinor = Number(acc.balanceMinor ?? acc.openingBalanceMinor ?? 0);
      return {
        id: acc.id,
        name: acc.name,
        accountType: acc.accountType,
        currency: acc.currency || 'USD',
        institutionName: acc.institutionName || null,
        balanceMinor: balMinor,
        balance: balMinor / 100,
        currentBalance: balMinor / 100,
        openingBalanceMinor: Number(acc.openingBalanceMinor ?? 0),
        color: acc.color || null,
        iconKey: acc.iconKey || null,
        displayOrder: acc.displayOrder ?? 0,
        status: acc.status || 'active',
        investedAmountMinor: acc.investedAmountMinor ? Number(acc.investedAmountMinor) : undefined,
        unrealizedGainLossMinor: acc.unrealizedGainLossMinor ? Number(acc.unrealizedGainLossMinor) : undefined,
        unrealizedGainLossPct: acc.unrealizedGainLossPct,
      };
    });

    return safeJsonResponse(serialized, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Failed to get accounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = postAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess(parsed.data.workspaceId);
    const workspaceId = authContext.workspaceId;

    const accountType = normalizeAccountType(parsed.data.accountType || parsed.data.type);

    let openingBalanceMinor = 0n;
    if (parsed.data.openingBalanceMinor !== undefined) {
      openingBalanceMinor = BigInt(parsed.data.openingBalanceMinor);
    } else if (parsed.data.balance !== undefined) {
      openingBalanceMinor = BigInt(Math.round(parsed.data.balance * 100));
    }

    const currency = parsed.data.currency.toUpperCase();

    const newAccount = await createAccount({
      workspaceId,
      name: parsed.data.name,
      accountType,
      institutionName: parsed.data.institutionName,
      currency,
      color: parsed.data.color,
      iconKey: parsed.data.iconKey,
      openingBalanceMinor,
      openingBalanceDate: new Date(),
    });

    // If requested or onboarding, sync workspace baseCurrency if not set
    if (parsed.data.updateBaseCurrency) {
      await db.update(workspace)
        .set({ baseCurrency: currency, updatedAt: new Date() })
        .where(eq(workspace.id, workspaceId));
    }

    // If investment account, create linked investment position and price snapshot
    if (accountType === 'investment') {
      const currentPrice = parsed.data.currentPrice;
      const totalInvested = parsed.data.balance !== undefined ? parsed.data.balance : Number(openingBalanceMinor) / 100;
      
      let units = '1';
      let avgCostMinor = openingBalanceMinor;

      if (parsed.data.units) {
        units = parsed.data.units.toString();
        if (Number(units) > 0) {
          avgCostMinor = BigInt(Math.round((totalInvested / Number(units)) * 100));
        }
      } else if (currentPrice && currentPrice > 0 && totalInvested > 0) {
        const computedUnits = (totalInvested / currentPrice).toFixed(4);
        units = computedUnits;
        avgCostMinor = BigInt(Math.round(currentPrice * 100));
      }

      const [position] = await db.insert(investmentPosition).values({
        workspaceId,
        financialAccountId: newAccount.id,
        name: parsed.data.name,
        symbol: parsed.data.symbol || null,
        assetType: 'mutual_fund',
        units,
        averageCostMinor: avgCostMinor,
        currency,
      }).returning();

      if (currentPrice && currentPrice > 0) {
        await db.insert(investmentPriceSnapshot).values({
          positionId: position.id,
          provider: 'quote',
          symbol: parsed.data.symbol || null,
          priceMinor: BigInt(Math.round(currentPrice * 100)),
          currency,
          observedAt: new Date(),
          isEstimated: true,
        });
      }

      // If monthly SIP amount is specified, create recurring SIP item scheduled on user-chosen day of month
      if (parsed.data.sipMonthlyAmount && parsed.data.sipMonthlyAmount > 0) {
        const customDay = parsed.data.sipMonthlyDay ? Math.min(31, Math.max(1, parsed.data.sipMonthlyDay)) : 1;
        await createRecurringItem({
          workspaceId,
          type: 'expense',
          name: `SIP - ${parsed.data.name}`,
          expectedAmountMinor: BigInt(Math.round(parsed.data.sipMonthlyAmount * 100)),
          currency,
          defaultAccountId: newAccount.id,
          frequency: 'monthly',
          dayRule: 'custom_day',
          customDay,
        });
      }
    }

    return safeJsonResponse({
      ...newAccount,
      balanceMinor: Number(newAccount.openingBalanceMinor),
      openingBalanceMinor: Number(newAccount.openingBalanceMinor),
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Failed to create account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

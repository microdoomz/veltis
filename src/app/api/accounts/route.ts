import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { createAccount, getAccounts } from '@/lib/services/account';
import { db } from '@/lib/db';
import { workspace, investmentPosition, investmentPriceSnapshot, recurringItem } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const postAccountSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  name: z.string().min(1, 'Account name is required'),
  type: z.string().optional(),
  accountType: z.enum(['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card']).optional(),
  institutionName: z.string().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  balance: z.coerce.number().optional(),
  openingBalanceMinor: z.union([z.bigint(), z.string(), z.number()]).optional(),
  color: z.string().optional().nullable(),
  iconKey: z.string().optional().nullable(),
  updateBaseCurrency: z.boolean().optional(),
  // Investment-specific parameters
  symbol: z.string().optional().nullable(),
  units: z.union([z.string(), z.number()]).optional().nullable(),
  currentPrice: z.coerce.number().optional().nullable(),
  sipMonthlyAmount: z.coerce.number().optional().nullable(),
});

function normalizeAccountType(rawType?: string): 'bank' | 'cash_wallet' | 'digital_wallet' | 'investment' | 'credit_card' {
  if (!rawType) return 'bank';
  const lower = rawType.toLowerCase();
  if (['bank', 'checking', 'savings', 'current'].includes(lower)) return 'bank';
  if (['credit', 'credit_card', 'card'].includes(lower)) return 'credit_card';
  if (['digital_wallet', 'wallet', 'paypal', 'venmo'].includes(lower)) return 'digital_wallet';
  if (['cash', 'cash_wallet'].includes(lower)) return 'cash_wallet';
  if (['investment', 'brokerage', 'stocks'].includes(lower)) return 'investment';
  return 'bank';
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWorkspaceId = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWorkspaceId);

    const accounts = await getAccounts(authContext.workspaceId);

    const serialized = accounts.map((acc) => ({
      ...acc,
      openingBalanceMinor: acc.openingBalanceMinor.toString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Failed to get accounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    const accountType = parsed.data.accountType || normalizeAccountType(parsed.data.type);

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

      // If monthly SIP amount is specified, create recurring SIP item
      if (parsed.data.sipMonthlyAmount && parsed.data.sipMonthlyAmount > 0) {
        await db.insert(recurringItem).values({
          workspaceId,
          type: 'expense',
          name: `SIP - ${parsed.data.name}`,
          expectedAmountMinor: BigInt(Math.round(parsed.data.sipMonthlyAmount * 100)),
          currency,
          defaultAccountId: newAccount.id,
          frequency: 'monthly',
          dayRule: 'first_day',
          active: true,
        });
      }
    }

    return NextResponse.json({
      ...newAccount,
      openingBalanceMinor: newAccount.openingBalanceMinor.toString(),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Failed to create account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

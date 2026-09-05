import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, inArray, desc, and } from 'drizzle-orm';
import {
  investmentPosition,
  investmentPriceSnapshot,
  investmentTransaction
} from '@/lib/db/schema';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { z } from 'zod';
import {
  recordContribution,
  recordWithdrawal,
  buyPosition,
  sellPosition,
  topUpPosition
} from '@/lib/investments/service';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    
    await requireStrictWorkspaceAccess(workspaceId);

    // Fetch investment accounts (active only)
    const accounts = await db.query.financialAccount.findMany({
      where: (account, { and, eq }) => 
        and(
          eq(account.workspaceId, workspaceId),
          eq(account.accountType, 'investment'),
          eq(account.status, 'active')
        ),
    });

    // Fetch positions only for active accounts
    const activeAccountIds = accounts.map(a => a.id);
    const positions = activeAccountIds.length > 0
      ? await db.query.investmentPosition.findMany({
          where: and(
            eq(investmentPosition.workspaceId, workspaceId),
            inArray(investmentPosition.financialAccountId, activeAccountIds)
          ),
        })
      : [];

    // Fetch latest price snapshot for each position
    const positionIds = positions.map(p => p.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let latestSnapshots: any[] = [];
    if (positionIds.length > 0) {
      const allSnapshots = await db.query.investmentPriceSnapshot.findMany({
        where: inArray(investmentPriceSnapshot.positionId, positionIds),
        orderBy: [desc(investmentPriceSnapshot.observedAt)],
      });

      // Deduplicate to keep only latest per position
      const seen = new Set();
      latestSnapshots = allSnapshots.filter(s => {
        if (seen.has(s.positionId)) return false;
        seen.add(s.positionId);
        return true;
      });
    }

    // Attach current price to positions
    const enrichedPositions = positions.map(pos => {
      const snapshot = latestSnapshots.find(s => s.positionId === pos.id);
      return {
        ...pos,
        currentPriceMinor: snapshot ? snapshot.priceMinor : pos.averageCostMinor,
        isEstimated: !!snapshot,
      };
    });

    // Fetch contribution history (investment_contribution transactions)
    // Actually, maybe we just fetch the investmentTransactions for history
    const history = await db.query.investmentTransaction.findMany({
      where: eq(investmentTransaction.workspaceId, workspaceId),
      orderBy: [desc(investmentTransaction.transactionDate)],
      limit: 50,
      with: {
        transaction: true
      }
    });

    const serialized = JSON.parse(JSON.stringify({
      accounts,
      positions: enrichedPositions,
      history,
    }, (key, value) => typeof value === 'bigint' ? value.toString() : value));

    return NextResponse.json(serialized);
  } catch (error: unknown) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

const transactionSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(['contribution', 'withdrawal', 'buy', 'sell', 'topup']),
  investmentAccountId: z.string().uuid().optional(),
  sourceAccountId: z.string().uuid().optional(), // For contribution or topup
  destinationAccountId: z.string().uuid().optional(), // For withdrawal
  positionId: z.string().uuid().optional(), // For buy/sell/topup
  amountMinor: z.number().int().positive().optional(), // For contribution/withdrawal/topup
  units: z.string().optional(), // For buy/sell
  priceMinor: z.number().int().positive().optional(), // For buy/sell
  currency: z.string().length(3),
  transactionDate: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = transactionSchema.parse(body);
    const { session } = await requireStrictWorkspaceAccess(data.workspaceId);
    const user = session;

    const date = new Date(data.transactionDate);

    let txId = '';
    switch (data.type) {
      case 'contribution':
        if (!data.sourceAccountId || !data.amountMinor || !data.investmentAccountId) throw new Error('Missing fields for contribution');
        txId = await recordContribution(
          data.workspaceId,
          data.sourceAccountId,
          data.investmentAccountId,
          BigInt(data.amountMinor),
          data.currency,
          date,
          user.user.id
        );
        break;
      case 'withdrawal':
        if (!data.destinationAccountId || !data.amountMinor || !data.investmentAccountId) throw new Error('Missing fields for withdrawal');
        txId = await recordWithdrawal(
          data.workspaceId,
          data.investmentAccountId,
          data.destinationAccountId,
          BigInt(data.amountMinor),
          data.currency,
          date,
          user.user.id
        );
        break;
      case 'buy':
        if (!data.positionId || !data.units || !data.priceMinor || !data.investmentAccountId) throw new Error('Missing fields for buy');
        txId = await buyPosition(
          data.workspaceId,
          data.investmentAccountId,
          data.positionId,
          data.units,
          BigInt(data.priceMinor),
          data.currency,
          date,
          user.user.id
        );
        break;
      case 'sell':
        if (!data.positionId || !data.units || !data.priceMinor) throw new Error('Missing fields for sell');
        if (!data.investmentAccountId) throw new Error('Missing investment account ID');
        txId = await sellPosition(
          data.workspaceId,
          data.investmentAccountId,
          data.positionId,
          data.units,
          BigInt(data.priceMinor),
          data.currency,
          date,
          user.user.id
        );
        break;
      case 'topup':
        if (!data.positionId || !data.amountMinor) throw new Error('Missing positionId or amount for top-up');
        txId = await topUpPosition(
          data.workspaceId,
          data.positionId,
          BigInt(data.amountMinor),
          BigInt(data.priceMinor || 1000),
          data.currency,
          date,
          user.user.id,
          data.sourceAccountId
        );
        break;
    }

    return NextResponse.json({ success: true, transactionId: txId });
  } catch (error: unknown) {
    console.error('Failed to process investment transaction:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

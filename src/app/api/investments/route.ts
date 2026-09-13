import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, inArray, desc, and } from 'drizzle-orm';
import {
  financialAccount,
  investmentPosition,
  investmentPriceSnapshot,
  investmentTransaction
} from '@/lib/db/schema';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { safeJsonResponse } from '@/lib/utils/serialization';
import {
  recordContribution,
  recordWithdrawal,
  buyPosition,
  sellPosition,
  topUpPosition
} from '@/lib/investments/service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, x-session-token',
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

    let totalInvestedMinor = 0n;
    let totalCurrentValueMinor = 0n;

    // Attach current price and computed valuation to positions
    const enrichedPositions = positions.map((pos) => {
      const snapshot = latestSnapshots.find((s) => s.positionId === pos.id);
      const currentPriceMinor = snapshot ? snapshot.priceMinor : (pos.averageCostMinor || 0n);
      const unitsNum = Number(pos.units || 0);
      const avgCostNum = Number(pos.averageCostMinor || 0) / 100;
      const curPriceNum = Number(currentPriceMinor || 0) / 100;
      const posInvested = unitsNum * avgCostNum;
      const posValuation = unitsNum * curPriceNum;
      const posGainLoss = posValuation - posInvested;
      const posGainLossPct = posInvested > 0 ? (posGainLoss / posInvested) * 100 : 0;

      if (unitsNum > 0) {
        totalInvestedMinor += BigInt(Math.round(posInvested * 100));
        totalCurrentValueMinor += BigInt(Math.round(posValuation * 100));
      }

      return {
        ...pos,
        symbol: pos.symbol || pos.name || '',
        name: pos.name,
        units: unitsNum,
        averageBuyPrice: avgCostNum,
        currentPrice: curPriceNum,
        currentValuation: posValuation,
        totalInvested: posInvested,
        unrealizedGainLoss: posGainLoss,
        unrealizedGainLossPercent: posGainLossPct,
        currentPriceMinor: currentPriceMinor.toString(),
        isEstimated: !!snapshot,
      };
    });

    const totalInvested = Number(totalInvestedMinor) / 100;
    const currentValuation = Number(totalCurrentValueMinor) / 100;
    const totalGainLoss = currentValuation - totalInvested;

    // Fetch contribution/trade history
    const history = await db.query.investmentTransaction.findMany({
      where: eq(investmentTransaction.workspaceId, workspaceId),
      orderBy: [desc(investmentTransaction.transactionDate)],
      limit: 50,
      with: {
        transaction: true
      }
    });

    return safeJsonResponse({
      accounts,
      positions: enrichedPositions,
      history,
      totalInvested,
      currentValuation,
      totalGainLoss,
    }, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: unknown) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    const requestedWorkspaceId = body.workspaceId || url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWorkspaceId);
    const workspaceId = authContext.workspaceId;
    const userId = authContext.session.user.id;

    const action = body.action || body.type; // 'buy' | 'sell' | 'contribution' | 'withdrawal' | 'topup' | 'top_up'
    const normalizedAction = action === 'top_up' ? 'topup' : action;
    const date = body.transactionDate && !isNaN(new Date(body.transactionDate).getTime())
      ? new Date(body.transactionDate)
      : new Date();
    const currency = (body.currency || 'USD').toUpperCase();
    const units = body.units ? String(body.units) : '0';
    const priceMinor = body.priceMinor
      ? BigInt(body.priceMinor)
      : body.price
      ? BigInt(Math.round(body.price * 100))
      : 0n;
    const amountMinor = body.amountMinor
      ? BigInt(body.amountMinor)
      : body.amount
      ? BigInt(Math.round(body.amount * 100))
      : 0n;

    // Resolve investment account
    let investmentAccountId = body.investmentAccountId || body.accountId;
    if (!investmentAccountId && body.positionId) {
      const pos = await db.query.investmentPosition.findFirst({
        where: eq(investmentPosition.id, body.positionId),
      });
      if (pos) investmentAccountId = pos.financialAccountId;
    }

    if (!investmentAccountId) {
      const firstInvAccount = await db.query.financialAccount.findFirst({
        where: and(
          eq(financialAccount.workspaceId, workspaceId),
          eq(financialAccount.accountType, 'investment'),
          eq(financialAccount.status, 'active')
        ),
      });
      investmentAccountId = firstInvAccount?.id;
    }

    if (!investmentAccountId && normalizedAction !== 'withdrawal') {
      // Create a default investment account if none exists
      const [newInvAccount] = await db.insert(financialAccount).values({
        workspaceId,
        name: 'Investment Portfolio',
        accountType: 'investment',
        currency,
        openingBalanceMinor: 0n,
        openingBalanceDate: date.toISOString().split('T')[0],
        status: 'active',
      }).returning();
      investmentAccountId = newInvAccount.id;
    }

    let positionId = body.positionId;
    if (!positionId && (normalizedAction === 'buy' || normalizedAction === 'sell' || normalizedAction === 'topup')) {
      // Find or create position by symbol/name
      const symbolOrName = body.symbol || body.name || 'ASSET';
      let pos = await db.query.investmentPosition.findFirst({
        where: and(
          eq(investmentPosition.workspaceId, workspaceId),
          eq(investmentPosition.symbol, symbolOrName)
        )
      });

      if (!pos) {
        const [createdPos] = await db.insert(investmentPosition).values({
          workspaceId,
          financialAccountId: investmentAccountId!,
          name: body.name || symbolOrName,
          symbol: symbolOrName,
          assetType: 'equity',
          units: '0',
          averageCostMinor: priceMinor > 0n ? priceMinor : 1000n,
          currency,
        }).returning();
        pos = createdPos;
      }
      positionId = pos.id;
    }

    let txId = '';
    switch (normalizedAction) {
      case 'contribution': {
        const sourceAccountId = body.sourceAccountId || body.accountId;
        if (!sourceAccountId || !amountMinor || !investmentAccountId) {
          throw new Error('Missing fields for contribution (sourceAccountId, amount, investmentAccountId)');
        }
        txId = await recordContribution(
          workspaceId,
          sourceAccountId,
          investmentAccountId,
          amountMinor,
          currency,
          date,
          userId
        );
        break;
      }
      case 'withdrawal': {
        const destinationAccountId = body.destinationAccountId || body.accountId;
        if (!destinationAccountId || !amountMinor || !investmentAccountId) {
          throw new Error('Missing fields for withdrawal (destinationAccountId, amount, investmentAccountId)');
        }
        txId = await recordWithdrawal(
          workspaceId,
          investmentAccountId,
          destinationAccountId,
          amountMinor,
          currency,
          date,
          userId
        );
        break;
      }
      case 'buy': {
        if (!positionId || !investmentAccountId) throw new Error('Missing position or investment account for buy');
        txId = await buyPosition(
          workspaceId,
          investmentAccountId,
          positionId,
          units,
          priceMinor > 0n ? priceMinor : 1000n,
          currency,
          date,
          userId
        );
        break;
      }
      case 'sell': {
        if (!positionId || !investmentAccountId) throw new Error('Missing position or investment account for sell');
        txId = await sellPosition(
          workspaceId,
          investmentAccountId,
          positionId,
          units,
          priceMinor > 0n ? priceMinor : 1000n,
          currency,
          date,
          userId
        );
        break;
      }
      case 'topup': {
        if (!positionId) throw new Error('Missing positionId for top-up');
        txId = await topUpPosition(
          workspaceId,
          positionId,
          amountMinor > 0n ? amountMinor : 10000n,
          priceMinor > 0n ? priceMinor : 1000n,
          currency,
          date,
          userId,
          body.sourceAccountId
        );
        break;
      }
      default:
        throw new Error(`Unsupported investment action: ${action}`);
    }

    return safeJsonResponse({ success: true, transactionId: txId }, { headers: corsHeaders });
  } catch (error: unknown) {
    console.error('Failed to process investment action:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400, headers: corsHeaders });
  }
}

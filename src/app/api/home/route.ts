import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getNetWealth, getLiquidSummary } from '@/lib/ledger/index';
import { getRecentTransactions, getAccountSummary } from '@/lib/ledger/queries';
import { getWorkspaceById } from '@/lib/services/workspace';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, x-session-token',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function safeSerialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWorkspaceId = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWorkspaceId);
    const workspaceId = authContext.workspaceId;

    const [netWealth, liquidSummary, recentTxns, accounts, currentWorkspace] = await Promise.all([
      getNetWealth(workspaceId),
      getLiquidSummary(workspaceId),
      getRecentTransactions(workspaceId, 25),
      getAccountSummary(workspaceId),
      getWorkspaceById(workspaceId),
    ]);

    const defaultTypeOrder = ['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card'];
    const workspaceTypeOrder = (currentWorkspace?.accountTypeOrder as string[] | undefined) || [];
    const typeOrder = [
      ...workspaceTypeOrder,
      ...defaultTypeOrder.filter((t) => !workspaceTypeOrder.includes(t)),
    ];

    const sortedAccounts = [...accounts].sort((a, b) => {
      const aTypeIdx = typeOrder.indexOf(a.accountType);
      const bTypeIdx = typeOrder.indexOf(b.accountType);
      const finalAIdx = aTypeIdx === -1 ? 999 : aTypeIdx;
      const finalBIdx = bTypeIdx === -1 ? 999 : bTypeIdx;
      if (finalAIdx !== finalBIdx) return finalAIdx - finalBIdx;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });

    const serializedAccounts = sortedAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      accountType: a.accountType,
      currency: a.currency || 'USD',
      institutionName: a.institutionName || null,
      balanceMinor: Number(a.balanceMinor ?? 0),
      color: a.color || null,
      iconKey: a.iconKey || null,
      displayOrder: a.displayOrder ?? 0,
      status: a.status || 'active',
    }));

    const serializedTxns = recentTxns.map((t) => {
      const firstLeg = t.legs?.[0];
      const dateStr = t.transactionDate
        ? typeof t.transactionDate === 'string'
          ? t.transactionDate
          : (t.transactionDate as Date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: t.id,
        transactionType: t.transactionType,
        amountMinor: Number(t.amountMinor ?? 0),
        currency: t.currency || 'USD',
        transactionDate: dateStr,
        description: t.description || undefined,
        merchantName: t.merchantName || undefined,
        categoryId: t.categoryId || undefined,
        categoryName: t.category?.name || undefined,
        categoryColor: undefined,
        accountId: firstLeg?.accountId || undefined,
        accountName: firstLeg?.account?.name || undefined,
        source: t.source || 'manual',
      };
    });

    const responsePayload = {
      workspace: {
        id: currentWorkspace?.id || workspaceId,
        name: currentWorkspace?.name || 'My Workspace',
        baseCurrency: currentWorkspace?.baseCurrency || 'USD',
        accountTypeOrder: typeOrder,
      },
      netWealth: Number(netWealth ?? 0),
      liquidSummary: {
        totalLiquid: Number(liquidSummary?.totalLiquid ?? 0),
        freeToSpend: Number(liquidSummary?.freeToSpend ?? 0),
        freeToSpendOnline: Number(liquidSummary?.freeToSpendOnline ?? 0),
        freeToSpendCash: Number(liquidSummary?.freeToSpendCash ?? 0),
        totalAllocated: Number(liquidSummary?.totalAllocated ?? 0),
      },
      accounts: serializedAccounts,
      recentTransactions: serializedTxns,
    };

    return NextResponse.json(safeSerialize(responsePayload), {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Failed to load home dashboard API:', error);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

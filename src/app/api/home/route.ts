import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getNetWealth, getLiquidSummary } from '@/lib/ledger/index';
import { getRecentTransactions, getAccountSummary } from '@/lib/ledger/queries';
import { getWorkspaceById } from '@/lib/services/workspace';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const workspaceId = authContext.workspaceId;

    const [netWealth, liquidSummary, recentTxns, accounts, currentWorkspace] = await Promise.all([
      getNetWealth(workspaceId),
      getLiquidSummary(workspaceId),
      getRecentTransactions(workspaceId, 15),
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
      ...a,
      balanceMinor: Number(a.balanceMinor),
      openingBalanceMinor: Number(a.openingBalanceMinor),
    }));

    const serializedTxns = recentTxns.map((t) => ({
      ...t,
      amountMinor: Number(t.amountMinor),
      transactionDate: t.transactionDate.toString(),
    }));

    return NextResponse.json({
      workspace: {
        id: currentWorkspace?.id || workspaceId,
        name: currentWorkspace?.name || 'My Workspace',
        baseCurrency: currentWorkspace?.baseCurrency || 'USD',
        accountTypeOrder: typeOrder,
      },
      netWealth: Number(netWealth),
      liquidSummary: {
        totalLiquid: Number(liquidSummary.totalLiquid),
        freeToSpend: Number(liquidSummary.freeToSpend),
        freeToSpendOnline: Number(liquidSummary.freeToSpendOnline),
        freeToSpendCash: Number(liquidSummary.freeToSpendCash),
        totalAllocated: Number(liquidSummary.totalAllocated),
      },
      accounts: serializedAccounts,
      recentTransactions: serializedTxns,
    }, {
      headers: corsHeaders,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized' || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
    }
    console.error('Failed to load home dashboard API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

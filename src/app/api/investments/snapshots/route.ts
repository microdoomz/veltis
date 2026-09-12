import { NextResponse } from 'next/server';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { z } from 'zod';
import { updateMarketPrice } from '@/lib/investments/service';
import { db } from '@/lib/db';
import { investmentPosition, financialAccount } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

const snapshotSchema = z.object({
  workspaceId: z.string().uuid(),
  positionId: z.string().uuid().optional(),
  manualPriceMinor: z.number().int().positive().optional(),
  manualCurrency: z.string().length(3).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = snapshotSchema.parse(body);
    await requireStrictWorkspaceAccess(data.workspaceId);

    const priceMinor = data.manualPriceMinor ? BigInt(data.manualPriceMinor) : undefined;

    if (data.positionId) {
      const res = await updateMarketPrice(
        data.workspaceId,
        data.positionId,
        priceMinor,
        data.manualCurrency
      );

      const serialized = JSON.parse(
        JSON.stringify(res, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
      );
      return NextResponse.json(serialized);
    }

    // Otherwise, sync all positions for active investment accounts in workspace
    const accounts = await db.query.financialAccount.findMany({
      where: and(
        eq(financialAccount.workspaceId, data.workspaceId),
        eq(financialAccount.accountType, 'investment'),
        eq(financialAccount.status, 'active')
      ),
    });

    const activeAccountIds = accounts.map((a) => a.id);
    if (activeAccountIds.length === 0) {
      return NextResponse.json({ success: true, syncedCount: 0, failedCount: 0, results: [] });
    }

    const positions = await db.query.investmentPosition.findMany({
      where: and(
        eq(investmentPosition.workspaceId, data.workspaceId),
        inArray(investmentPosition.financialAccountId, activeAccountIds)
      ),
    });

    const results = [];
    for (const pos of positions) {
      try {
        const res = await updateMarketPrice(data.workspaceId, pos.id);
        results.push({ name: pos.name, ...res });
      } catch (err: unknown) {
        results.push({
          positionId: pos.id,
          name: pos.name,
          success: false,
          error: (err as Error).message || 'Failed to sync',
        });
      }
    }

    const syncedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    const serialized = JSON.parse(
      JSON.stringify(
        {
          success: failedCount === 0 || syncedCount > 0,
          syncedCount,
          failedCount,
          results,
        },
        (_k, v) => (typeof v === 'bigint' ? v.toString() : v)
      )
    );

    return NextResponse.json(serialized);
  } catch (error: unknown) {
    console.error('Failed to update market price:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { getInvestmentAnalytics } from '@/lib/services/analytics';
import { z } from 'zod';

const querySchema = z.object({
  workspaceId: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = querySchema.parse({
      workspaceId: url.searchParams.get('workspaceId'),
    });

    await requireStrictWorkspaceAccess(data.workspaceId);

    const result = await getInvestmentAnalytics(data.workspaceId);

    const serialized = {
      positions: result.positions.map(p => ({
        ...p,
        averageCostMinor: p.averageCostMinor?.toString(),
        latestPriceMinor: p.latestPriceMinor?.toString(),
        estimatedValueMinor: p.estimatedValueMinor.toString(),
        totalCostPosition: p.totalCostPosition.toString(),
        unrealizedGainLoss: p.unrealizedGainLoss.toString(),
      })),
      summary: {
        totalValueMinor: result.summary.totalValueMinor.toString(),
        totalCostMinor: result.summary.totalCostMinor.toString(),
        totalUnrealizedGainLoss: result.summary.totalUnrealizedGainLoss.toString(),
      }
    };

    return NextResponse.json(serialized);
  } catch (error: unknown) {
    console.error('Failed to fetch investment analytics:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

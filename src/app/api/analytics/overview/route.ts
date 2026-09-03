import { NextResponse } from 'next/server';
import { requireUser, requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { getOverviewAnalytics } from '@/lib/services/analytics';
import { z } from 'zod';

const querySchema = z.object({
  workspaceId: z.string().uuid(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = querySchema.parse({
      workspaceId: url.searchParams.get('workspaceId'),
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
    });

    await requireStrictWorkspaceAccess(data.workspaceId);

    const result = await getOverviewAnalytics(data.workspaceId, {
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });

    // Convert bigints to string for JSON serialization
    return NextResponse.json({
      totalSpending: result.totalSpending.toString(),
      totalIncome: result.totalIncome.toString(),
      netDifference: result.netDifference.toString(),
    });
  } catch (error: unknown) {
    console.error('Failed to fetch overview analytics:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

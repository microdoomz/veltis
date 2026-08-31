import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { z } from 'zod';
import { updateMarketPrice } from '@/lib/investments/service';

const snapshotSchema = z.object({
  workspaceId: z.string().uuid(),
  positionId: z.string().uuid(),
  manualPriceMinor: z.number().int().positive().optional(),
  manualCurrency: z.string().length(3).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const data = snapshotSchema.parse(body);

    const priceMinor = data.manualPriceMinor ? BigInt(data.manualPriceMinor) : undefined;

    await updateMarketPrice(
      data.workspaceId,
      data.positionId,
      priceMinor,
      data.manualCurrency
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to update market price:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { reconcileAccount } from '@/lib/services/reconciliation';
import { z } from 'zod';

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  actualBalanceMinor: z.string().regex(/^-?\d+$/),
  createAdjustment: z.boolean(),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const json = await req.json();
    const data = bodySchema.parse(json);
    const { session } = await requireStrictWorkspaceAccess(data.workspaceId);

    const result = await reconcileAccount({
      workspaceId: data.workspaceId,
      accountId: id,
      userId: session.user.id,
      actualBalanceMinor: BigInt(data.actualBalanceMinor),
      createAdjustment: data.createAdjustment,
      note: data.note,
    });

    return NextResponse.json({
      success: true,
      reconciliationId: result.id,
    });
  } catch (error: unknown) {
    console.error('Failed to reconcile account:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

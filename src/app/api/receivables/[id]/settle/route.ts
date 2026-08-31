import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { settleReceivable, settleReceivableSchema } from '@/lib/services/receivables';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authContext = await requireWorkspaceAccess();
    const userContext = await requireUser();
    
    const body = await req.json();
    
    const dataToParse = {
      ...body,
      receivableId: params.id,
      workspaceId: authContext.workspaceId,
      createdByUserId: userContext.user.id,
      settledAt: body.settledAt ? new Date(body.settledAt) : new Date(),
      amountMinor: typeof body.amountMinor === 'number' ? BigInt(body.amountMinor) : (typeof body.amountMinor === 'string' ? BigInt(body.amountMinor) : body.amountMinor),
    };
    
    const parsed = settleReceivableSchema.safeParse(dataToParse);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error }, { status: 400 });
    }
    
    const updated = await settleReceivable(parsed.data);
    
    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...updated,
      amountMinor: updated.amountMinor.toString()
    };
    
    return NextResponse.json(serialized, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('already settled')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

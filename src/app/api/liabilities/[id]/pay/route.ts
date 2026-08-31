import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { payLiability, payLiabilitySchema } from '@/lib/services/liabilities';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authContext = await requireWorkspaceAccess();
    const userContext = await requireUser();
    
    const body = await req.json();
    
    const dataToParse = {
      ...body,
      liabilityId: id,
      workspaceId: authContext.workspaceId,
      createdByUserId: userContext.user.id,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      amountMinor: typeof body.amountMinor === 'number' ? BigInt(body.amountMinor) : (typeof body.amountMinor === 'string' ? BigInt(body.amountMinor) : body.amountMinor),
    };
    
    const parsed = payLiabilitySchema.safeParse(dataToParse);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error }, { status: 400 });
    }
    
    const updated = await payLiability(parsed.data);
    
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
    if (error instanceof Error && error.message.includes('already paid')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

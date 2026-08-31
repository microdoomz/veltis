import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { confirmOccurrence } from '@/lib/services/recurring';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const authContext = await requireWorkspaceAccess();
    const userContext = await requireUser();
    
    const body = await req.json();
    const accountId = body.accountId;
    
    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }
    
    const actualDateStr = body.actualDateStr;
    const actualAmountMinor = (body.actualAmountMinor !== undefined && body.actualAmountMinor !== null) 
      ? BigInt(body.actualAmountMinor) 
      : undefined;

    await confirmOccurrence(
      params.id,
      authContext.workspaceId,
      accountId,
      userContext.user.id,
      actualDateStr,
      actualAmountMinor
    );
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already confirmed'))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

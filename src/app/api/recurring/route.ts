import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { createRecurringItem, getRecurringItemsWithOccurrences, createRecurringItemSchema } from '@/lib/services/recurring';

export async function GET() {
  try {
    const authContext = await requireWorkspaceAccess();
    
    const records = await getRecurringItemsWithOccurrences(authContext.workspaceId);
    
    return NextResponse.json(records);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const userContext = await requireUser();
    
    const body = await req.json();
    
    // Convert baseDate from string to Date
    const dataToParse = {
      ...body,
      workspaceId: authContext.workspaceId,
      createdByUserId: userContext.user.id,
      baseDate: body.baseDate ? new Date(body.baseDate) : undefined,
      expectedAmountMinor: typeof body.expectedAmountMinor === 'number' ? BigInt(body.expectedAmountMinor) : (typeof body.expectedAmountMinor === 'string' ? BigInt(body.expectedAmountMinor) : body.expectedAmountMinor),
    };
    
    const parsed = createRecurringItemSchema.safeParse(dataToParse);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error }, { status: 400 });
    }
    
    const newItem = await createRecurringItem(parsed.data);
    
    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...newItem,
      expectedAmountMinor: newItem.expectedAmountMinor.toString()
    };
    
    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

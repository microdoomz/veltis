import { NextResponse } from 'next/server';
import { requireUser, requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { createReceivable, createReceivableSchema } from '@/lib/services/receivables';
import { db } from '@/lib/db';
import { receivable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const authContext = await requireStrictWorkspaceAccess(workspaceId!);
    
    const records = await db.query.receivable.findMany({
      where: eq(receivable.workspaceId, authContext.workspaceId),
      orderBy: (receivable, { desc }) => [desc(receivable.createdDate)]
    });
    
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
    const body = await req.json();
    const authContext = await requireStrictWorkspaceAccess(body.workspaceId);
    const userContext = await requireUser();
    
    // Process string dates back into Date objects for Zod schema
    
    // Process string dates back into Date objects for Zod schema
    const dataToParse = {
      ...body,
      workspaceId: authContext.workspaceId,
      createdByUserId: userContext.user.id,
      createdDate: body.createdDate ? new Date(body.createdDate) : undefined,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
      amountMinor: typeof body.amountMinor === 'number' ? BigInt(body.amountMinor) : (typeof body.amountMinor === 'string' ? BigInt(body.amountMinor) : body.amountMinor),
    };
    
    const parsed = createReceivableSchema.safeParse(dataToParse);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error }, { status: 400 });
    }
    
    const newReceivable = await createReceivable(parsed.data);
    
    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...newReceivable,
      amountMinor: newReceivable.amountMinor.toString()
    };
    
    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

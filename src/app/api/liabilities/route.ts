import { NextResponse } from 'next/server';
import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';
import { createLiability, createLiabilitySchema } from '@/lib/services/liabilities';
import { db } from '@/lib/db';
import { liability } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { safeJsonResponse } from '@/lib/utils/serialization';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(workspaceId);
    
    const records = await db.query.liability.findMany({
      where: eq(liability.workspaceId, authContext.workspaceId),
      orderBy: (liability, { desc }) => [desc(liability.createdDate)]
    });
    
    return safeJsonResponse(records, { headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    console.error('Liabilities GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authContext = await requireWorkspaceAccess(body.workspaceId);
    const userContext = await requireUser();
    
    const dataToParse = {
      ...body,
      workspaceId: authContext.workspaceId,
      createdByUserId: userContext.user.id,
      createdDate: body.createdDate ? new Date(body.createdDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      amountMinor: typeof body.amountMinor === 'number' ? BigInt(body.amountMinor) : (typeof body.amountMinor === 'string' ? BigInt(body.amountMinor) : body.amountMinor),
    };
    
    const parsed = createLiabilitySchema.safeParse(dataToParse);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error }, { status: 400, headers: corsHeaders });
    }
    
    const newLiability = await createLiability(parsed.data);
    
    return safeJsonResponse(newLiability, { status: 201, headers: corsHeaders });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('workspace') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    console.error('Liabilities POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}


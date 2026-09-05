import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { 
  getAllocationsByAccount, 
  createAllocation, 
  deleteAllocation 
} from '@/lib/services/allocation';
import { z } from 'zod';

const createAllocationSchema = z.object({
  name: z.string().min(1, 'Allocation name / purpose is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  color: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const authContext = await requireWorkspaceAccess();

    const data = await getAllocationsByAccount(authContext.workspaceId, accountId);
    
    return NextResponse.json({
      allocations: data.allocations.map(a => ({
        ...a,
        amountMinor: a.amountMinor.toString(),
      })),
      totalAllocatedMinor: data.totalAllocatedMinor.toString(),
    });
  } catch (error) {
    console.error('Failed to get allocations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const authContext = await requireWorkspaceAccess();

    const body = await req.json();
    const parsed = createAllocationSchema.parse(body);

    const amountMinor = BigInt(Math.round(parsed.amount * 100));

    const item = await createAllocation({
      workspaceId: authContext.workspaceId,
      financialAccountId: accountId,
      name: parsed.name,
      description: parsed.description,
      amountMinor,
      color: parsed.color,
    });

    return NextResponse.json({
      success: true,
      allocation: {
        ...item,
        amountMinor: item.amountMinor.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Failed to create allocation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create allocation' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireWorkspaceAccess();
    const url = new URL(req.url);
    const allocationId = url.searchParams.get('allocationId');

    if (!allocationId) {
      return NextResponse.json({ error: 'allocationId is required' }, { status: 400 });
    }

    await deleteAllocation(authContext.workspaceId, allocationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete allocation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

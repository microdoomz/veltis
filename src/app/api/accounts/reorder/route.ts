import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { reorderAccounts } from '@/lib/services/account';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const reorderSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  accountOrders: z.array(z.object({
    id: z.string().uuid(),
    displayOrder: z.number().optional(),
  })).optional(),
}).refine((data) => (data.accountIds && data.accountIds.length > 0) || (data.accountOrders && data.accountOrders.length > 0), {
  message: 'Either accountIds or accountOrders must be provided',
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess(parsed.data.workspaceId);
    
    let targetIds: string[] = [];
    if (parsed.data.accountOrders && parsed.data.accountOrders.length > 0) {
      const sorted = [...parsed.data.accountOrders].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      targetIds = sorted.map((item) => item.id);
    } else if (parsed.data.accountIds) {
      targetIds = parsed.data.accountIds;
    }

    await reorderAccounts(authContext.workspaceId, targetIds);

    revalidatePath('/(app)', 'layout');
    revalidatePath('/accounts');
    revalidatePath('/home');

    return NextResponse.json({ success: true, accountIds: targetIds });
  } catch (error: unknown) {
    console.error('Failed to reorder accounts:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

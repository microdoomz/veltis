import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { reorderAccounts } from '@/lib/services/account';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const reorderSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  accountIds: z.array(z.string().uuid()),
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess(parsed.data.workspaceId);
    await reorderAccounts(authContext.workspaceId, parsed.data.accountIds);

    revalidatePath('/accounts');
    revalidatePath('/home');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to reorder accounts:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

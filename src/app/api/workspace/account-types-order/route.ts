import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { workspace } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const bodySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  accountTypeOrder: z.array(z.string()),
});

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess(parsed.data.workspaceId);
    const workspaceId = authContext.workspaceId;

    await db.update(workspace)
      .set({
        accountTypeOrder: parsed.data.accountTypeOrder,
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));

    revalidatePath('/accounts');

    return NextResponse.json({ success: true, accountTypeOrder: parsed.data.accountTypeOrder });
  } catch (error: unknown) {
    console.error('Failed to update account types order:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

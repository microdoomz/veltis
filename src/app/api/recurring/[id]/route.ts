import { NextResponse } from 'next/server';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { deleteRecurringItem } from '@/lib/services/recurring';

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const authContext = await requireStrictWorkspaceAccess(workspaceId);

    await deleteRecurringItem(id, authContext.workspaceId);

    return NextResponse.json({ success: true, message: 'Recurring item deleted' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

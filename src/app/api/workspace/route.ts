import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { getWorkspaceById, updateWorkspace } from '@/lib/services/workspace';
import { z } from 'zod';

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseCurrency: z.string().length(3).optional(),
});

export async function GET() {
  try {
    const authContext = await requireWorkspaceAccess();
    const ws = await getWorkspaceById(authContext.workspaceId);

    if (!ws) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      workspace: ws,
      role: authContext.membership?.role,
      user: authContext.session?.user,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch workspace' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authContext = await requireWorkspaceAccess();
    const role = authContext.membership?.role;

    if (role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only the workspace owner can update settings' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateWorkspaceSchema.parse(body);

    const updated = await updateWorkspace(authContext.workspaceId, validated);

    return NextResponse.json({
      success: true,
      workspace: updated,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update workspace' }, { status: 500 });
  }
}

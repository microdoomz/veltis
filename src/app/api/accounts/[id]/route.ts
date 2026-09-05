import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { updateAccount, deleteAccount, updateAccountSchema, getAccountById } from '@/lib/services/account';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authContext = await requireWorkspaceAccess();
    const account = await getAccountById(authContext.workspaceId, id);

    return NextResponse.json({
      ...account,
      openingBalanceMinor: account.openingBalanceMinor.toString(),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authContext = await requireWorkspaceAccess();
    const body = await req.json();

    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const updated = await updateAccount(authContext.workspaceId, id, parsed.data);

    return NextResponse.json({
      ...updated,
      openingBalanceMinor: updated.openingBalanceMinor.toString(),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('Failed to update account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authContext = await requireWorkspaceAccess();

    await deleteAccount(authContext.workspaceId, id);

    return NextResponse.json({ success: true, message: 'Account archived successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    console.error('Failed to delete account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

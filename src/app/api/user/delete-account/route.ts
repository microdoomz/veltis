import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { deleteUserAccount } from '@/lib/services/user-delete';

export async function POST() {
  try {
    const session = await requireUser();
    const userId = session.user.id;

    await deleteUserAccount(userId);

    const response = NextResponse.json({ success: true });
    // Expire/clear session cookies
    response.cookies.delete('better-auth.session_token');
    response.cookies.delete('better-auth.session_data');

    return response;
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

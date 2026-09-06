import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { account, passkey, user, twoFactor } from '@/lib/db/auth-schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const userContext = await requireUser();
    const userId = userContext.user.id;

    const [userAccounts, userPasskeys, dbUser, userTwoFactor] = await Promise.all([
      db.query.account.findMany({
        where: eq(account.userId, userId),
      }),
      db.query.passkey.findMany({
        where: eq(passkey.userId, userId),
      }),
      db.query.user.findFirst({
        where: eq(user.id, userId),
      }),
      db.query.twoFactor.findFirst({
        where: eq(twoFactor.userId, userId),
      }),
    ]);

    const hasCredentialAccount = userAccounts.some(
      (a) => a.providerId === 'credential' && Boolean(a.password)
    );

    const providers = userAccounts.map((a) => a.providerId);

    return NextResponse.json({
      userId,
      hasPassword: hasCredentialAccount,
      providers,
      hasPasskeys: userPasskeys.length > 0,
      passkeysCount: userPasskeys.length,
      passkeys: userPasskeys.map((p) => ({
        id: p.id,
        name: p.name || 'Device Biometrics (Passkey)',
        createdAt: p.createdAt,
      })),
      hasTotp: Boolean(userTwoFactor?.secret && userTwoFactor?.verified),
      twoFactorEnabled: Boolean(dbUser?.twoFactorEnabled),
      isGoogleUser: providers.includes('google') && !hasCredentialAccount,
    });
  } catch (error) {
    console.error('Failed to get security profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userContext = await requireUser();
    const userId = userContext.user.id;
    const { passkeyId, action } = await request.json();

    if (passkeyId) {
      await db.delete(passkey).where(and(eq(passkey.id, passkeyId), eq(passkey.userId, userId)));
      return NextResponse.json({ success: true, message: 'Passkey removed successfully' });
    }

    if (action === 'disable_totp') {
      await db.delete(twoFactor).where(eq(twoFactor.userId, userId));
      // If user has no passkeys remaining, also disable twoFactorEnabled on user
      const remainingPasskeys = await db.query.passkey.findMany({
        where: eq(passkey.userId, userId),
      });
      if (remainingPasskeys.length === 0) {
        await db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, userId));
      }
      return NextResponse.json({ success: true, message: 'Authenticator app disabled' });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in security-profile DELETE:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}

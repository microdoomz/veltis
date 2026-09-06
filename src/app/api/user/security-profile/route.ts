import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { account, passkey, user } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userContext = await requireUser();
    const userId = userContext.user.id;

    const [userAccounts, userPasskeys, dbUser] = await Promise.all([
      db.query.account.findMany({
        where: eq(account.userId, userId),
      }),
      db.query.passkey.findMany({
        where: eq(passkey.userId, userId),
      }),
      db.query.user.findFirst({
        where: eq(user.id, userId),
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
      twoFactorEnabled: Boolean(dbUser?.twoFactorEnabled),
      isGoogleUser: providers.includes('google') && !hasCredentialAccount,
    });
  } catch (error) {
    console.error('Failed to get security profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

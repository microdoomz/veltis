import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const callbackURL = `${url.origin}/api/auth/mobile-callback`;

    // Attempt to let Better Auth generate the social sign-in redirect URL
    const res = await auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL,
      },
    });

    if (res?.url) {
      return NextResponse.redirect(res.url);
    }

    // Direct fallback if Better Auth returns internal error or doesn't redirect
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      const redirectUri = encodeURIComponent(`${url.origin}/api/auth/callback/google`);
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email&access_type=offline&prompt=consent`;
      return NextResponse.redirect(googleOAuthUrl);
    }

    return NextResponse.json({ error: 'Google OAuth not configured on server' }, { status: 500 });
  } catch (error) {
    console.error('Failed to initiate Google OAuth login for mobile:', error);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      const url = new URL(request.url);
      const redirectUri = encodeURIComponent(`${url.origin}/api/auth/callback/google`);
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email&access_type=offline&prompt=consent`;
      return NextResponse.redirect(googleOAuthUrl);
    }
    return NextResponse.json({ error: 'Failed to initiate Google login' }, { status: 500 });
  }
}

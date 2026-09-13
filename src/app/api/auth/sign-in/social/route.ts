import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || 'google';
  if (provider === 'google') {
    const mobileLoginUrl = new URL('/api/auth/mobile-login/google', url.origin);
    const callbackURL = url.searchParams.get('callbackURL');
    if (callbackURL) {
      mobileLoginUrl.searchParams.set('callbackURL', callbackURL);
    }
    return NextResponse.redirect(mobileLoginUrl);
  }
  return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  return auth.handler(request);
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Check session token from query params, cookies (standard or secure), or session object
    const sessionToken = 
      request.nextUrl.searchParams.get('token') ||
      request.cookies.get('__Secure-better-auth.session_token')?.value ||
      request.cookies.get('better-auth.session_token')?.value || 
      session?.session?.token || 
      '';

    const intentUrl = `intent://auth/callback?token=${encodeURIComponent(sessionToken)}#Intent;scheme=veltis;package=com.veltis.android;end`;
    const customSchemeUrl = `veltis://auth/callback?token=${encodeURIComponent(sessionToken)}`;

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful — Veltis</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #020617; color: #F8FAFC; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
            .card { padding: 2.5rem 2rem; border-radius: 1.25rem; border: 1px solid #1E293B; background: #0F172A; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .icon { width: 56px; height: 56px; background: rgba(20, 184, 166, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: #14B8A6; font-size: 26px; }
            h2 { margin: 0 0 0.5rem; color: #F8FAFC; font-size: 1.35rem; font-weight: 700; }
            p { font-size: 0.925rem; color: #94A3B8; line-height: 1.5; margin: 0 0 1.75rem; }
            .btn { display: block; width: 100%; padding: 0.9rem; background: #14B8A6; color: #020617; text-decoration: none; border-radius: 0.75rem; font-weight: 700; font-size: 1rem; box-sizing: border-box; transition: background 0.2s; }
            .btn:active { background: #0D9488; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Authentication Successful</h2>
            <p>You have signed in with Google. Returning you to the Veltis app...</p>
            <a id="openBtn" class="btn" href="${intentUrl}">Open Veltis App</a>
          </div>
          <script>
            var intentUrl = "${intentUrl}";
            var customUrl = "${customSchemeUrl}";

            // Check if token was in cookie if not set by server
            if (!("${sessionToken}")) {
              var match = document.cookie.match(new RegExp('(?:^|; )(?:__Secure-)?better-auth\\\\.session_token=([^;]+)'));
              if (match) {
                var tok = match[1];
                intentUrl = "intent://auth/callback?token=" + encodeURIComponent(tok) + "#Intent;scheme=veltis;package=com.veltis.android;end";
                customUrl = "veltis://auth/callback?token=" + encodeURIComponent(tok);
                document.getElementById("openBtn").href = intentUrl;
              }
            }

            // Immediately launch app intent
            try {
              window.location.replace(intentUrl);
            } catch (_) {
              window.location.href = customUrl;
            }

            setTimeout(function() {
              window.location.href = customUrl;
            }, 600);
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Failed to handle mobile auth callback:', error);
    return new NextResponse(
      `<!DOCTYPE html><html><body><script>window.location.href="veltis://auth/callback?error=auth_failed";</script><p>Authentication failed. <a href="veltis://auth/callback?error=auth_failed">Return to app</a></p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

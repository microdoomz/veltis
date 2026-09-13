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

    if (sessionToken) {
      // Redirect to native app deep link
      return NextResponse.redirect(`veltis://auth/callback?token=${encodeURIComponent(sessionToken)}`);
    }

    // If session token is not immediately available, render auto-redirect page
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating with Veltis...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #09090b; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { padding: 2rem; border-radius: 1rem; border: 1px solid #27272a; background: #18181b; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { margin-top: 0; color: #10b981; font-size: 1.25rem; }
            p { font-size: 0.875rem; color: #a1a1aa; line-height: 1.5; }
            a { display: inline-block; margin-top: 1.25rem; padding: 0.75rem 1.5rem; background: #10b981; color: #fff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Completed</h2>
            <p>Your sign-in with Google was successful. Tap below if you are not automatically redirected to the Veltis app.</p>
            <a id="openBtn" href="veltis://auth/callback">Open Veltis App</a>
          </div>
          <script>
            // Check cookie in document
            var match = document.cookie.match(new RegExp('(?:^|; )(?:__Secure-)?better-auth\\\\.session_token=([^;]+)'));
            var token = match ? match[1] : "${sessionToken}";
            if (token) {
              var target = "veltis://auth/callback?token=" + encodeURIComponent(token);
              document.getElementById("openBtn").href = target;
              window.location.href = target;
            }
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
    return NextResponse.redirect('veltis://auth/callback?error=auth_failed');
  }
}

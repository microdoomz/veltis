import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const callbackURL = `${url.origin}/api/auth/mobile-callback`;

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Connecting to Google — Veltis</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            background-color: #020617;
            color: #F8FAFC;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .card {
            padding: 2.25rem 2rem;
            border-radius: 1.25rem;
            border: 1px solid #1E293B;
            background: #0F172A;
            max-width: 360px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 3.5px solid #1E293B;
            border-top-color: #14B8A6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1.25rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          h3 {
            margin: 0 0 0.5rem;
            font-size: 1.15rem;
            font-weight: 700;
            color: #F8FAFC;
          }
          p {
            font-size: 0.875rem;
            color: #94A3B8;
            margin: 0 0 1.25rem;
            line-height: 1.5;
          }
          .btn {
            display: none;
            width: 100%;
            padding: 0.85rem;
            background: #14B8A6;
            color: #020617;
            text-decoration: none;
            border-radius: 0.75rem;
            font-weight: 700;
            font-size: 0.95rem;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner" id="spinner"></div>
          <h3 id="title">Connecting to Google</h3>
          <p id="desc">Redirecting you to Google Sign-In...</p>
          <a id="retryBtn" class="btn" href="javascript:location.reload()">Retry Connection</a>
        </div>
        <script>
          (function() {
            var callback = "${callbackURL}";
            fetch('/api/auth/sign-in/social', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                provider: 'google',
                callbackURL: callback
              }),
              credentials: 'include'
            })
            .then(function(res) {
              return res.json();
            })
            .then(function(data) {
              if (data && data.url) {
                window.location.replace(data.url);
              } else {
                showError('Unable to obtain Google login URL. Please try again.');
              }
            })
            .catch(function(err) {
              showError('Network error connecting to auth service.');
            });

            function showError(msg) {
              var sp = document.getElementById('spinner');
              if (sp) sp.style.display = 'none';
              document.getElementById('title').textContent = 'Sign-In Interrupted';
              document.getElementById('desc').textContent = msg;
              var btn = document.getElementById('retryBtn');
              if (btn) btn.style.display = 'block';
            }
          })();
        </script>
      </body>
    </html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

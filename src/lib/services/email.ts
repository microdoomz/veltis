import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'Veltis <noreply@veltis.app>';

type EmailTemplateType = 'verify_email' | 'reset_password' | 'magic_link';

interface EmailTemplateData {
  title: string;
  preview: string;
  greeting: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
  secondaryMessage?: string;
}

function getEmailTemplateHTML(data: EmailTemplateData): string {
  // Matches Veltis design brief: clean, #0D9488 (Teal), Sans-serif (Inter/system), card layout
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    body {
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      line-height: 1.5;
    }
    .container {
      max-width: 500px;
      margin: 40px auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }
    .header {
      margin-bottom: 24px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #0D9488;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .content h1 {
      font-size: 20px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .content p {
      font-size: 15px;
      color: #475569;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #0D9488;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 500;
      font-size: 15px;
      padding: 12px 24px;
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 13px;
      color: #94a3b8;
    }
    .fallback-link {
      font-size: 13px;
      color: #64748b;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${data.preview}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <h2 class="logo">Veltis</h2>
      </div>
      <div class="content">
        <h1>${data.greeting}</h1>
        <p>${data.message}</p>
        <div class="button-container">
          <a href="${data.buttonUrl}" class="button" target="_blank">${data.buttonText}</a>
        </div>
        ${data.secondaryMessage ? `<p>${data.secondaryMessage}</p>` : ''}
        <p class="fallback-link">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${data.buttonUrl}" style="color: #0D9488;">${data.buttonUrl}</a>
        </p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Veltis. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

interface UserEmailData {
  name?: string | null;
  email: string;
}

export async function sendAuthEmail(type: EmailTemplateType, user: UserEmailData, url: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Veltis Email] RESEND_API_KEY not configured, skipping email delivery.');
    console.log(`[Veltis Email] Type: ${type} | To: ${user.email} | URL: ${url}`);
    return;
  }

  let templateData: EmailTemplateData;

  const firstName = user.name?.split(' ')[0] || 'there';

  switch (type) {
    case 'verify_email':
      templateData = {
        title: 'Verify your email address',
        preview: 'Please verify your email address to complete your Veltis registration.',
        greeting: `Hi ${firstName},`,
        message: 'Welcome to Veltis! To start tracking your finances securely, please verify your email address by clicking the button below.',
        buttonText: 'Verify Email',
        buttonUrl: url,
        secondaryMessage: 'This link will expire in 24 hours. If you did not create a Veltis account, you can safely ignore this email.',
      };
      break;
    case 'reset_password':
      templateData = {
        title: 'Reset your password',
        preview: 'Instructions to reset your Veltis password.',
        greeting: `Hi ${firstName},`,
        message: 'We received a request to reset the password for your Veltis account. Click the button below to choose a new password.',
        buttonText: 'Reset Password',
        buttonUrl: url,
        secondaryMessage: 'This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.',
      };
      break;
    case 'magic_link':
      templateData = {
        title: 'Sign in to Veltis',
        preview: 'Your magic link to securely sign in to Veltis.',
        greeting: `Hi ${firstName},`,
        message: 'Click the button below to securely sign in to your Veltis account. No password required.',
        buttonText: 'Sign In to Veltis',
        buttonUrl: url,
        secondaryMessage: 'This link will expire in 5 minutes. If you did not request this email, please ignore it.',
      };
      break;
    default:
      throw new Error(`Unsupported email type: ${type}`);
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: templateData.title,
      html: getEmailTemplateHTML(templateData),
    });
  } catch (error) {
    console.error(`[Veltis Email] Failed to send ${type} email to ${user.email}:`, error);
    // Don't throw to prevent breaking the auth flow for users, but log heavily.
  }
}

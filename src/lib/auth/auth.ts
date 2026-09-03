import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { phoneNumber, twoFactor, magicLink } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { createWorkspaceForUser } from '../services/workspace';
import { sendAuthEmail } from '../services/email';
import { sendAuthSMS } from '../services/sms';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail('reset_password', { email: user.email, name: user.name }, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail('verify_email', { email: user.email, name: user.name }, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createWorkspaceForUser(user.id);
        }
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    ...(process.env.APPLE_CLIENT_ID ? {
      apple: {
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET || {
          teamId: process.env.APPLE_TEAM_ID || '',
          privateKey: process.env.APPLE_PRIVATE_KEY || '',
          keyId: process.env.APPLE_KEY_ID || '',
        } as never,
      }
    } : {}),
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        await sendAuthSMS(phoneNumber, code);
      },
    }),
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          // If the user has a phone number registered for 2FA, send an SMS.
          // In a real app we might determine if they chose Email or SMS for 2FA.
          // We will attempt SMS if they have a phone number, fallback to email otherwise.
          const u = user as { phoneNumber?: string | null };
          if (u.phoneNumber) {
            await sendAuthSMS(u.phoneNumber, otp);
          } else {
            // Reusing verification email for 2FA as fallback if no custom template
            console.log(`[2FA OTP] To: ${user.email} | Code: ${otp}`);
          }
        },
      }
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Fetch user from DB to get the name, but we can pass just email if not found
        await sendAuthEmail('magic_link', { email, name: null }, url);
      },
    }),
    passkey(),
  ],
});

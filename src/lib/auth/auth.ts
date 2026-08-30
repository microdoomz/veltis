import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { phoneNumber, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { createWorkspaceForUser } from '../services/workspace';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
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
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      teamId: process.env.APPLE_TEAM_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
      keyId: process.env.APPLE_KEY_ID!,
    },
  },
  plugins: [
    phoneNumber(),
    twoFactor(),
    passkey(),
  ],
});

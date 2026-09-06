import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

function getBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    passkeyClient(),
    phoneNumberClient(),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Handled by in-page 2FA challenge flow
      },
    }),
  ]
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    passkeyClient(),
    phoneNumberClient(),
    twoFactorClient()
  ]
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;

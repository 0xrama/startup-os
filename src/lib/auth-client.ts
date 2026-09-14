import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL || ""
      : window.location.origin,
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        if (typeof window !== "undefined") {
          window.location.assign("/two-factor");
        }
      },
    }),
    passkeyClient(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;

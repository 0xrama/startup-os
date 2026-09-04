import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const fallbackAuthUrl =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || undefined;

const allowedHosts = [
  fallbackAuthUrl ? getUrlHost(fallbackAuthUrl) : null,
  process.env.NEXT_PUBLIC_APP_URL
    ? getUrlHost(process.env.NEXT_PUBLIC_APP_URL)
    : null,
  "localhost:3000",
].filter((value, index, values): value is string => {
  return isNonEmptyString(value) && values.indexOf(value) === index;
});

const authBaseUrl =
  allowedHosts.length > 0
    ? {
        allowedHosts,
        fallback: fallbackAuthUrl,
        protocol: "auto" as const,
      }
    : fallbackAuthUrl;

const trustedOrigins = [
  fallbackAuthUrl,
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
].filter((value, index, values): value is string => {
  return isNonEmptyString(value) && values.indexOf(value) === index;
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || undefined,
  baseURL: authBaseUrl,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      enabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      phoneVerified: { type: "boolean", required: false, defaultValue: false },
      whatsappOptedIn: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      timezone: { type: "string", required: false, defaultValue: "UTC" },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

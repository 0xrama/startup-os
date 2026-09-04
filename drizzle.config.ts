import { defineConfig } from "drizzle-kit";

const d1HttpAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const d1HttpDatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const d1HttpToken = process.env.CLOUDFLARE_D1_TOKEN;

const useD1Http = Boolean(d1HttpAccountId && d1HttpDatabaseId && d1HttpToken);
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig(
  useD1Http
    ? {
        schema: "./src/lib/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        driver: "d1-http",
        dbCredentials: {
          accountId: d1HttpAccountId!,
          databaseId: d1HttpDatabaseId!,
          token: d1HttpToken!,
        },
      }
    : {
        schema: "./src/lib/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: databaseUrl ?? "file:./dev.sqlite",
        },
      }
);

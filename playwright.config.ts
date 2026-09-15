import { defineConfig } from "@playwright/test";

const url =
  process.env.TEST_DATABASE_URL ?? "postgres://invalid@127.0.0.1:1/pax_test";

export default defineConfig({
  testDir: "./tests/browser",
  globalSetup: "./tests/require-test-database.ts",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3037", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec next start --hostname 127.0.0.1 --port 3037",
    url: "http://127.0.0.1:3037/api/health",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: url,
      HYPERDRIVE_CONNECTION_STRING: url,
      BETTER_AUTH_URL: "http://127.0.0.1:3037",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3037",
      BETTER_AUTH_SECRET: "browser-test-only-secret-not-for-production",
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    },
  },
});

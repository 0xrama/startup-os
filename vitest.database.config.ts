import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://invalid@127.0.0.1:1/pax_test";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/database/**/*.test.ts"],
    globalSetup: ["tests/require-test-database.ts"],
    env: {
      DATABASE_URL: databaseUrl,
      HYPERDRIVE_CONNECTION_STRING: databaseUrl,
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    },
    fileParallelism: false,
    testTimeout: 20_000,
  },
});

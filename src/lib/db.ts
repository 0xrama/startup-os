import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function getConnectionString() {
  const connectionString =
    process.env.HYPERDRIVE_CONNECTION_STRING ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Database connection string missing. Set DATABASE_URL, or HYPERDRIVE_CONNECTION_STRING when running on Cloudflare Workers."
    );
  }

  return connectionString;
}

function createDb() {
  const configuredMax = Number(process.env.DATABASE_POOL_MAX ?? 3);

  if (
    !Number.isInteger(configuredMax) ||
    configuredMax < 1 ||
    configuredMax > 20
  ) {
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 20.");
  }

  const pool = new Pool({
    connectionString: getConnectionString(),
    max: configuredMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    query_timeout: 35_000,
  });

  return drizzle(pool, { schema });
}

type DbInstance = ReturnType<typeof createDb>;

type GlobalWithDb = typeof globalThis & {
  __paxDb?: DbInstance;
};

// SAFETY: GlobalWithDb only adds an optional cache property to globalThis;
// all standard global properties retain their existing types.
const globalWithDb = globalThis as GlobalWithDb;

export function getDb() {
  globalWithDb.__paxDb ??= createDb();

  return globalWithDb.__paxDb;
}

// SAFETY: the Proxy target is never read; every access is routed through
// getDb(), which returns the lazily created drizzle instance.
export const db = new Proxy({} as DbInstance, {
  get(_target, property) {
    // SAFETY: property arrives from member access on `db`; the underlying
    // drizzle instance exposes those same keys. Symbol probes fall through to
    // the non-function branch below.
    const value = getDb()[property as keyof DbInstance];

    return value instanceof Function ? value.bind(getDb()) : value;
  },
});

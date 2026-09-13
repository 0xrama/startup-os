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
  const pool = new Pool({
    connectionString: getConnectionString(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return drizzle(pool, { schema });
}

type DbInstance = ReturnType<typeof createDb>;

type GlobalWithDb = typeof globalThis & {
  __paxDb?: DbInstance;
};

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

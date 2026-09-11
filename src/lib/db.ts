import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** Opaque handle drizzle receives back from `prepare` calls on the binding. */
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
};

type D1CompatibleDb = {
  prepare(query: string): D1Statement;
};

declare global {
  var __D1_DB__: D1CompatibleDb | undefined;
}

type D1RuntimeGlobals = {
  __D1_DB__?: D1CompatibleDb;
  __env__?: {
    DB?: D1CompatibleDb;
  };
  DB?: D1CompatibleDb;
  env?: {
    DB?: D1CompatibleDb;
  };
};

function getD1Database() {
  // SAFETY: globalThis only carries the extra DB shims in local and test
  // runtimes; every lookup is optional-chained so absent bindings resolve to
  // the "missing binding" error below instead of a crash.
  const globals = globalThis as D1RuntimeGlobals;

  const d1 =
    globals.__D1_DB__ ??
    env.DB ??
    globals.__env__?.DB ??
    globals.DB ??
    globals.env?.DB;

  if (!d1) {
    throw new Error(
      "D1 database binding missing. Set globalThis.__D1_DB__ (local shim) or provide DB on the Cloudflare runtime env."
    );
  }

  return d1;
}

function createDb() {
  return drizzle(getD1Database(), { schema });
}

type DbInstance = ReturnType<typeof createDb>;

let cachedDb: DbInstance | null = null;

export function getDb() {
  cachedDb ??= createDb();

  return cachedDb;
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

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1CompatibleDb = {
  prepare: (...args: unknown[]) => unknown;
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

export const db = new Proxy({} as DbInstance, {
  get(_target, property) {
    const value = getDb()[property as keyof DbInstance];
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

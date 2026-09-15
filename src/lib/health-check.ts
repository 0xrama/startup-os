import { NextRequest, NextResponse } from "next/server";

import { getFeatureFlags } from "@/lib/feature-flags";
import { incrementMetric } from "@/lib/metrics";
import { db } from "@/lib/db";
import { authorizeInternalRequest } from "@/lib/internal-auth";
import { checkObjectStorage } from "@/lib/r2";
import { attachRequestId, resolveRequestId } from "@/lib/request-context";

function readinessQuery(text: string) {
  // node-postgres supports a per-query deadline; its QueryConfig declaration
  // omits this option even though the driver reads it.
  const config = { text, query_timeout: 5_000 };

  return db.$client.query(config);
}

export const healthCheckServices = {
  authorizeInternalRequest,
  checkDatabase: () => readinessQuery("select 1 from jobs limit 1"),
  checkObjectStorage,
  checkWorker: async () => {
    const result = await readinessQuery(
      "select 1 from worker_heartbeats where last_seen_at > now() - interval '5 minutes' limit 1"
    );

    if (!result.rowCount) throw new Error("No recent worker heartbeat");
  },
};

export async function handleHealthCheck(
  request: NextRequest,
  services = healthCheckServices
) {
  const requestId = resolveRequestId(request);
  incrementMetric("health_checks_total");

  // Deep readiness is for operators: it touches the database and object
  // storage, so it stays behind the internal secret.
  if (new URL(request.url).searchParams.get("deep") === "true") {
    if (!services.authorizeInternalRequest(request)) {
      return attachRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

    const checks: Record<string, string> = {};

    const dependencies = {
      database: services.checkDatabase,
      storage: services.checkObjectStorage,
      worker: services.checkWorker,
    };

    await Promise.all(
      Object.entries(dependencies).map(async ([name, check]) => {
        try {
          await check();
          checks[name] = "ok";
        } catch {
          checks[name] = "unreachable";
        }
      })
    );

    const healthy = Object.values(checks).every((status) => status === "ok");

    return attachRequestId(
      NextResponse.json(
        {
          status: healthy ? "ok" : "degraded",
          checks,
          timestamp: new Date().toISOString(),
          requestId,
        },
        { status: healthy ? 200 : 503 }
      ),
      requestId
    );
  }

  return attachRequestId(
    NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      requestId,
      featureFlags: getFeatureFlags(),
    }),
    requestId
  );
}

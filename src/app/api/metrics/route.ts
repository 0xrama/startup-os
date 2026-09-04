import { NextRequest } from "next/server";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { incrementMetric, renderMetrics } from "@/lib/metrics";
import { attachRequestId, resolveRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const internalSecret = process.env.INTERNAL_CRON_SECRET;

  if (
    internalSecret &&
    request.headers.get("x-internal-secret") !== internalSecret
  ) {
    return attachRequestId(
      new Response("Unauthorized", { status: 401 }),
      requestId
    );
  }

  if (!isFeatureFlagEnabled("requestMetrics")) {
    return attachRequestId(
      new Response("Metrics disabled", { status: 404 }),
      requestId
    );
  }

  incrementMetric("metrics_scrapes_total");

  return attachRequestId(
    new Response(renderMetrics(), {
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
      },
    }),
    requestId
  );
}

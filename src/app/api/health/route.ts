import { NextRequest, NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/feature-flags";
import { incrementMetric } from "@/lib/metrics";
import { attachRequestId, resolveRequestId } from "@/lib/request-context";
import { isVectorizeEnabled } from "@/lib/vectorize";

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  incrementMetric("health_checks_total");

  return attachRequestId(
    NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      requestId,
      vectorizeEnabled: isVectorizeEnabled(),
      featureFlags: getFeatureFlags(),
    }),
    requestId
  );
}

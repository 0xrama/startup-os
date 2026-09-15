import type { NextRequest } from "next/server";

import { handleHealthCheck } from "@/lib/health-check";

export async function GET(request: NextRequest) {
  return handleHealthCheck(request);
}

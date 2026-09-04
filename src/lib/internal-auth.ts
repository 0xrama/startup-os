import { NextRequest } from "next/server";

export function authorizeInternalRequest(request: NextRequest) {
  const provided = request.headers.get("x-internal-secret");
  return Boolean(
    process.env.INTERNAL_CRON_SECRET &&
      provided &&
      provided === process.env.INTERNAL_CRON_SECRET
  );
}

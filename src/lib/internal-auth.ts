import { NextRequest } from "next/server";

function getExpectedSecret() {
  return process.env.INTERNAL_CRON_SECRET ?? process.env.CRON_SECRET;
}

export function authorizeInternalRequest(request: NextRequest) {
  const expected = getExpectedSecret();

  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  const bearer =
    authorization?.startsWith("Bearer ") === true
      ? authorization.slice("Bearer ".length).trim()
      : null;

  const querySecret = new URL(request.url).searchParams.get("secret");

  const provided =
    request.headers.get("x-internal-secret") ?? bearer ?? querySecret;

  return Boolean(provided && provided === expected);
}

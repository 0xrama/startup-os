import { NextRequest } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { attachRequestId, resolveRequestId } from "@/lib/request-context";

const logger = createLogger("auth-route");
const handler = toNextJsHandler(auth);

function getRequestPathname(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/api/auth";
  }
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const response = attachRequestId(await handler.GET(request), requestId);

    if (response.status >= 500) {
      logger.error("Better Auth GET handler returned an error response", {
        requestId,
        pathname: getRequestPathname(request),
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    logger.error("Better Auth GET handler failed", {
      requestId,
      error,
      pathname: getRequestPathname(request),
    });

    return new Response("Authentication request failed", {
      status: 500,
      headers: { "x-request-id": requestId },
    });
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const response = attachRequestId(await handler.POST(request), requestId);

    if (response.status >= 500) {
      logger.error("Better Auth POST handler returned an error response", {
        requestId,
        pathname: getRequestPathname(request),
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    logger.error("Better Auth POST handler failed", {
      requestId,
      error,
      pathname: getRequestPathname(request),
    });

    return new Response(
      error instanceof Error ? error.message : "Authentication request failed",
      {
        status: 500,
        headers: { "x-request-id": requestId },
      }
    );
  }
}

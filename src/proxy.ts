import { NextRequest, NextResponse } from "next/server";
import { resolveRequestId } from "@/lib/request-context";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = resolveRequestId(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Protected routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    // Check for Better Auth session cookie
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname === "/login" || pathname === "/signup") {
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");

    if (sessionCookie) {
      const response = NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
      response.headers.set("x-request-id", requestId);
      return response;
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const proxy = middleware;
export default middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

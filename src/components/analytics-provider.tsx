"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { COOKIE_CONSENT_KEY } from "@/components/cookie-consent";

const analyticsEnabled = process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === "true";
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let posthogBooted = false;

function hasAnalyticsConsent() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
}

function bootPostHog() {
  if (
    !analyticsEnabled ||
    !posthogKey ||
    posthogBooted ||
    !hasAnalyticsConsent()
  ) {
    return false;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  posthogBooted = true;
  return true;
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!bootPostHog()) {
      return;
    }

    const search = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: search ? `${pathname}?${search}` : pathname,
      pathname,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!bootPostHog()) {
      return;
    }

    const onError = (event: ErrorEvent) => {
      posthog.capture("frontend_error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      posthog.capture("frontend_unhandled_rejection", {
        reason: String(event.reason),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

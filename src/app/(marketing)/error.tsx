"use client";

import { RouteErrorState } from "@/components/app/route-error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      title="Page unavailable"
      message="This page failed to load correctly. Retry the request and try again."
      reset={reset}
    />
  );
}


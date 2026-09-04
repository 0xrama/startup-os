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
      title="Dashboard unavailable"
      message="The dashboard hit a loading problem. Retry to refresh the current view."
      reset={reset}
    />
  );
}


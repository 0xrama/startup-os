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
      title="Workspace unavailable"
      message="This LLC workspace failed to load. Retry to restore the current page."
      reset={reset}
    />
  );
}

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
      title="App unavailable"
      message="We hit a problem while loading your workspace. Retry to continue."
      reset={reset}
    />
  );
}


"use client";

import { RouteErrorState } from "@/components/app/route-error-state";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <RouteErrorState
          title="Something went wrong"
          message="An unexpected error interrupted the app. Retry the view to continue."
          reset={reset}
        />
      </body>
    </html>
  );
}


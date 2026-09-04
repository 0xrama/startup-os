"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteErrorState({
  title,
  message,
  reset,
}: {
  title: string;
  message: string;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
      <div className="card-warm max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="heading-serif text-3xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <Button onClick={reset} className="mt-6 btn-warm border-0">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}


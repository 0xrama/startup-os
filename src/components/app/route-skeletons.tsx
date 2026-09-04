import { Skeleton } from "@/components/ui/skeleton";

export function AuthPageSkeleton() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm sm:p-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card-warm p-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-32" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function MarketingPageSkeleton() {
  return (
    <div className="px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6 text-center">
        <Skeleton className="mx-auto h-8 w-48 rounded-full" />
        <Skeleton className="mx-auto h-16 w-4/5" />
        <Skeleton className="mx-auto h-5 w-3/5" />
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  );
}


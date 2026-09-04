import { db } from "@/lib/db";
import {
  llcCollaborators,
  llcs,
  complianceTasks,
  documents,
} from "@/lib/schema";
import { eq, and, lte, ne, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  Building2,
  CalendarClock,
  FolderOpen,
  Plus,
  AlertCircle,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultSetupCard } from "@/components/dashboard/vault-setup-card";
import { requirePageSubscription } from "@/lib/access";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";

export default async function DashboardPage() {
  const { session } = await requirePageSubscription();

  const userLlcs = await db
    .select()
    .from(llcs)
    .where(eq(llcs.userId, session.user.id));
  const collaboratorRows = await db.query.llcCollaborators.findMany({
    where: eq(llcCollaborators.userId, session.user.id),
  });
  const collaboratorLlcs =
    collaboratorRows.length > 0
      ? await db.query.llcs.findMany({
          where: (fields, { inArray }) =>
            inArray(
              fields.id,
              collaboratorRows.map((row) => row.llcId)
            ),
        })
      : [];
  const visibleLlcs = [...userLlcs, ...collaboratorLlcs].filter(
    (llc, index, list) =>
      list.findIndex((entry) => entry.id === llc.id) === index
  );

  const llcIds = visibleLlcs.map((l) => l.id);
  let upcomingTasks: (typeof complianceTasks.$inferSelect)[] = [];
  let docCount = 0;

  if (llcIds.length > 0) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    upcomingTasks = await db
      .select()
      .from(complianceTasks)
      .where(
        and(
          inArray(complianceTasks.llcId, llcIds),
          lte(
            complianceTasks.dueDate,
            thirtyDaysFromNow.toISOString().split("T")[0]
          ),
          ne(complianceTasks.status, "completed")
        )
      );

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, session.user.id));
    docCount = docs.length;
  }

  const overdueTasks = upcomingTasks.filter((t) => t.status === "overdue");

  // Per-entity stats computed from existing upcomingTasks array (no extra DB calls)
  const pendingCountByLlc = new Map<string, number>();
  const nextDeadlineByLlc = new Map<string, string | null>();

  for (const task of upcomingTasks) {
    pendingCountByLlc.set(
      task.llcId,
      (pendingCountByLlc.get(task.llcId) ?? 0) + 1
    );
    const next = nextDeadlineByLlc.get(task.llcId);
    if (
      next === undefined ||
      (task.dueDate && (next === null || task.dueDate < next))
    ) {
      nextDeadlineByLlc.set(task.llcId, task.dueDate);
    }
  }

  return (
    <FadeIn>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s an overview of your compliance status.
          </p>
        </div>
        <Link href="/onboarding">
          <Button size="sm" className="gap-1.5 text-[13px]">
            <Plus className="h-3.5 w-3.5" />
            Add entity
          </Button>
        </Link>
      </div>

      <VaultSetupCard />

      {/* Metrics */}
      <StaggerContainer className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-px border border-border bg-border">
        <StaggerItem className="bg-background p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Entities
            </p>
            <Building2 className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="mt-2 heading-serif text-5xl">{visibleLlcs.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {visibleLlcs.length === 0 ? "No entities yet" : "Active"}
          </p>
        </StaggerItem>
        <StaggerItem className="bg-background p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Due in 30 days
            </p>
            <CalendarClock className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="mt-2 heading-serif text-5xl">{upcomingTasks.length}</p>
          {overdueTasks.length > 0 ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {overdueTasks.length} overdue
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">Tasks</p>
          )}
        </StaggerItem>
        <StaggerItem className="bg-background p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Documents
            </p>
            <FolderOpen className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="mt-2 heading-serif text-5xl">{docCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">In vault</p>
        </StaggerItem>
      </StaggerContainer>

      {/* Entities */}
      {visibleLlcs.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <Building2
            className="mx-auto h-8 w-8 text-muted-foreground/40"
            strokeWidth={1.5}
          />
          <h3 className="mt-4 text-sm font-semibold">No entities yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Add your first LLC or corporation to start tracking compliance
            obligations.
          </p>
          <Link href="/onboarding">
            <Button size="sm" className="mt-5 gap-1.5 text-[13px]">
              <Plus className="h-3.5 w-3.5" />
              Add entity
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className={
            upcomingTasks.length > 0 ? "grid lg:grid-cols-5 gap-8" : undefined
          }
        >
          {/* Entities list */}
          <div
            className={upcomingTasks.length > 0 ? "lg:col-span-3" : undefined}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Entities</h2>
              <span className="text-[11px] text-muted-foreground">
                {visibleLlcs.length} total
              </span>
            </div>
            <StaggerContainer className="flex flex-col">
              {visibleLlcs.map((llc) => {
                const pendingCount = pendingCountByLlc.get(llc.id) ?? 0;
                const nextDeadline = nextDeadlineByLlc.get(llc.id) ?? null;
                return (
                  <StaggerItem key={llc.id}>
                    <Link
                      href={`/dashboard/llc/${llc.id}`}
                      className="group flex items-center justify-between border border-border px-5 py-4 transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-secondary">
                          <Building2
                            className="h-4 w-4 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {llc.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {llc.state}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs text-muted-foreground">
                              {llc.entityType}
                            </span>
                            {llc.einStatus === "pending" && (
                              <>
                                <span className="text-muted-foreground/30">
                                  ·
                                </span>
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <Clock className="h-3 w-3" />
                                  EIN pending
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex shrink-0 flex-col items-end gap-0.5 pr-2 text-right">
                          {pendingCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {pendingCount} pending
                            </span>
                          )}
                          {nextDeadline && (
                            <span className="font-mono text-[11px] text-muted-foreground/70">
                              {nextDeadline}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>

          {/* Deadlines — only shown when there are upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Upcoming deadlines</h2>
                <span className="text-[11px] text-muted-foreground">
                  Next 30 days
                </span>
              </div>
              <div className="divide-y divide-border border border-border">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {task.category}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pl-4">
                      {task.status === "overdue" && (
                        <span className="inline-flex items-center bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          Overdue
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-muted-foreground font-mono">
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </FadeIn>
  );
}

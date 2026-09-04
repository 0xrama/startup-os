"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type ComplianceTaskRecord,
  getDerivedTaskState,
  getTaskStatusLabel,
  getVisibleTasks,
} from "@/lib/compliance-task-details";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00.000Z`));
}

function stateIcon(state: ReturnType<typeof getDerivedTaskState>) {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />;
    case "overdue":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "due_soon":
      return <Clock3 className="h-4 w-4 text-[#B45309]" />;
    default:
      return <CalendarDays className="h-4 w-4 text-muted-foreground" />;
  }
}

export function LlcCalendarView({
  llcName,
  initialTasks,
}: {
  llcName: string;
  initialTasks: ComplianceTaskRecord[];
}) {
  const visibleTasks = useMemo(
    () =>
      [...getVisibleTasks(initialTasks)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [initialTasks]
  );
  const anchorDate = visibleTasks[0]?.dueDate
    ? new Date(`${visibleTasks[0].dueDate}T00:00:00.000Z`)
    : new Date();
  const [activeMonth, setActiveMonth] = useState(startOfMonth(anchorDate));
  const [selectedDate, setSelectedDate] = useState(
    visibleTasks[0]?.dueDate ?? new Date().toISOString().split("T")[0]
  );

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, ComplianceTaskRecord[]>();
    for (const task of visibleTasks) {
      grouped.set(task.dueDate, [...(grouped.get(task.dueDate) ?? []), task]);
    }
    return grouped;
  }, [visibleTasks]);

  const selectedTasks = tasksByDate.get(selectedDate) ?? [];
  const monthStart = startOfMonth(activeMonth);
  const monthEnd = endOfMonth(activeMonth);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = date.toISOString().split("T")[0];
    return {
      key,
      date,
      isCurrentMonth: date.getMonth() === activeMonth.getMonth(),
      isToday: key === new Date().toISOString().split("T")[0],
      tasks: tasksByDate.get(key) ?? [],
    };
  });

  const dueSoonCount = visibleTasks.filter((task) => getDerivedTaskState(task) === "due_soon")
    .length;
  const overdueCount = visibleTasks.filter((task) => getDerivedTaskState(task) === "overdue")
    .length;
  const completedCount = visibleTasks.filter((task) => getDerivedTaskState(task) === "completed")
    .length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Calendar view
          </p>
          <h1 className="heading-serif mt-2 text-3xl">Compliance calendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Month view for {llcName}. Click a day to inspect every filing, renewal, or task
            attached to it.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Due soon</p>
            <p className="mt-1 text-2xl font-semibold">{dueSoonCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="mt-1 text-2xl font-semibold">{overdueCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Filed</p>
            <p className="mt-1 text-2xl font-semibold">{completedCount}</p>
          </div>
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="card-warm border border-dashed border-border p-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No visible tasks yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tasks will appear here once your LLC profile creates them or once you add them
            manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="card-elevated border border-border/70 p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{formatMonth(activeMonth)}</h2>
                <p className="text-sm text-muted-foreground">
                  A proper month layout so dates read like a real calendar, not a loose list.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setActiveMonth(
                      new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1)
                    )
                  }
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const today = new Date();
                    setActiveMonth(startOfMonth(today));
                    setSelectedDate(today.toISOString().split("T")[0]);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setActiveMonth(
                      new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1)
                    )
                  }
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {DAY_NAMES.map((dayName) => (
                <div key={dayName} className="px-2 py-1">
                  {dayName}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {gridDays.map((day) => {
                const isSelected = day.key === selectedDate;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.key);
                      setActiveMonth(startOfMonth(day.date));
                    }}
                    className={cn(
                      "min-h-[120px] rounded-2xl border p-2 text-left transition-colors sm:min-h-[138px]",
                      isSelected
                        ? "border-primary bg-primary/6"
                        : "border-border bg-background hover:border-primary/30 hover:bg-secondary/40",
                      !day.isCurrentMonth && "bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                          day.isToday && "bg-primary text-primary-foreground",
                          !day.isToday && day.isCurrentMonth && "bg-secondary/70"
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                      {day.tasks.length > 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          {day.tasks.length} item{day.tasks.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {day.tasks.slice(0, 3).map((task) => {
                        const taskState = getDerivedTaskState(task);
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "rounded-xl px-2 py-1 text-[11px] leading-tight",
                              taskState === "completed" && "bg-[#2D6A4F]/10 text-[#2D6A4F]",
                              taskState === "overdue" && "bg-destructive/10 text-destructive",
                              taskState === "due_soon" && "bg-[#B45309]/10 text-[#B45309]",
                              taskState === "upcoming" && "bg-secondary text-foreground"
                            )}
                          >
                            <p className="line-clamp-2">{task.title}</p>
                          </div>
                        );
                      })}
                      {day.tasks.length > 3 ? (
                        <p className="px-1 text-[11px] text-muted-foreground">
                          +{day.tasks.length - 3} more
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="card-elevated border border-border/70 p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Agenda
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{formatLongDate(selectedDate)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This is the day-by-day detail panel, similar to the agenda rail in calendar apps.
              </p>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No filings or reminders on this day.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedTasks.map((task) => {
                  const taskState = getDerivedTaskState(task);
                  return (
                    <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5">{stateIcon(taskState)}</span>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <Badge
                          variant={taskState === "overdue" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {getTaskStatusLabel(taskState)}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {task.category ? <span>{task.category.replaceAll("_", " ")}</span> : null}
                        <span>Due {task.dueDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-4">
              <h3 className="text-sm font-semibold">Month window</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatLongDate(monthStart.toISOString().split("T")[0])} to{" "}
                {formatLongDate(monthEnd.toISOString().split("T")[0])}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

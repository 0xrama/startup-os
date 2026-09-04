import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { requirePageLlcAccess } from "@/lib/access";

function statusIcon(status: string | null) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />;
    case "overdue":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "due_soon":
      return <Clock className="h-4 w-4 text-[#B45309]" />;
    default:
      return <CalendarClock className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusBorderColor(status: string | null) {
  switch (status) {
    case "overdue":
      return "border-l-destructive";
    case "due_soon":
      return "border-l-[#B45309]";
    case "completed":
      return "border-l-[#2D6A4F]";
    default:
      return "border-l-border";
  }
}

function statusVariant(status: string | null) {
  switch (status) {
    case "completed":
      return "secondary" as const;
    case "overdue":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await requirePageLlcAccess(id);
  const llc = access.llc;

  const tasks = await db
    .select()
    .from(complianceTasks)
    .where(eq(complianceTasks.llcId, id));

  // Sort: overdue first, then by due date
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (b.status === "overdue" && a.status !== "overdue") return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const pending = sorted.filter((t) => t.status !== "completed");
  const completed = sorted.filter((t) => t.status === "completed");

  return (
    <div>
      <div className="mb-10">
        <h1 className="heading-serif text-3xl mb-1">Compliance Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Track deadlines and filing dates for {llc.name}.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="card-warm p-12 text-center border border-dashed border-border group">
          <div className="icon-container mx-auto mb-4 w-fit bg-secondary rounded-xl p-3">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No compliance tasks yet</h3>
          <p className="text-sm text-muted-foreground">
            Tasks will be automatically generated based on your LLC profile, or
            you can create them manually.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Upcoming ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((task) => (
                  <div
                    key={task.id}
                    className={`card-warm border-l-3 p-4 ${statusBorderColor(task.status)} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      {statusIcon(task.status)}
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <Badge variant={statusVariant(task.status)} className="text-xs">
                        {task.status}
                      </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Completed ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map((task) => (
                  <div
                    key={task.id}
                    className={`card-warm border-l-3 p-4 opacity-60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${statusBorderColor(task.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {statusIcon(task.status)}
                      <p className="font-medium text-sm line-through">
                        {task.title}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {task.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

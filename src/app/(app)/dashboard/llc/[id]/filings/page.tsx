import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, Clock } from "lucide-react";
import { requirePageLlcAccess } from "@/lib/access";

export default async function FilingsPage({
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

  // Group by category
  const categories = tasks.reduce(
    (acc, task) => {
      const cat = task.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
    },
    {} as Record<string, typeof tasks>
  );

  const categoryLabels: Record<string, string> = {
    federal_tax: "Federal Tax Filings",
    state_tax: "State Tax Filings",
    annual_report: "Annual Reports",
    ra_renewal: "Registered Agent Renewals",
    boi_report: "BOI Reports",
    other: "Other",
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="heading-serif text-3xl mb-1">Filing History</h1>
        <p className="text-sm text-muted-foreground">
          View past and upcoming filings for {llc.name}.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="card-warm p-12 text-center border border-dashed border-border group">
          <div className="icon-container mx-auto mb-4 w-fit bg-secondary rounded-xl p-3">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No filings tracked yet</h3>
          <p className="text-sm text-muted-foreground">
            Filing tasks will appear here once your compliance calendar is set
            up.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categories).map(([cat, catTasks]) => (
            <div key={cat}>
              <h2 className="heading-serif text-lg mb-3">
                {categoryLabels[cat] || cat}
              </h2>
              <div className="space-y-2">
                {catTasks.map((task) => (
                  <div
                    key={task.id}
                    className="card-warm p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "secondary"
                            : task.status === "overdue"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {task.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                        Due {task.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

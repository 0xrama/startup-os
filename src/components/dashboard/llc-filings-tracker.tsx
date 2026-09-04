"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type ComplianceTaskMetadata,
  type ComplianceTaskRecord,
  getChecklistProgress,
  getDerivedTaskState,
  getTaskMetadata,
  getTaskStatusLabel,
  isTaskVisible,
} from "@/lib/compliance-task-details";

const CATEGORY_LABELS: Record<string, string> = {
  federal_tax: "Federal filing",
  state_tax: "State filing",
  annual_report: "Annual report",
  ra_renewal: "Registered agent",
  boi_report: "BOI",
  other: "Other",
};

type FilingDraft = {
  applicable: boolean;
  completed: boolean;
  checklist: NonNullable<ComplianceTaskMetadata["checklist"]>;
  filedAt: string;
  filedMethod: NonNullable<NonNullable<ComplianceTaskMetadata["filing"]>["filedMethod"]> | "";
  acknowledgementStatus:
    | NonNullable<NonNullable<ComplianceTaskMetadata["filing"]>["acknowledgementStatus"]>
    | "";
  acknowledgementReference: string;
  notes: string;
};

function buildDraft(task: ComplianceTaskRecord): FilingDraft {
  const metadata = getTaskMetadata(task);

  return {
    applicable: metadata.applicable !== false,
    completed: task.status === "completed",
    checklist: metadata.checklist ?? [],
    filedAt: metadata.filing?.filedAt ?? "",
    filedMethod: metadata.filing?.filedMethod ?? "",
    acknowledgementStatus: metadata.filing?.acknowledgementStatus ?? "",
    acknowledgementReference: metadata.filing?.acknowledgementReference ?? "",
    notes: metadata.filing?.notes ?? "",
  };
}

function sortByDueDate(tasks: ComplianceTaskRecord[]) {
  return [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function FilingCard({
  task,
  isSaving,
  onSave,
  onApplicabilityChange,
}: {
  task: ComplianceTaskRecord;
  isSaving: boolean;
  onSave: (
    taskId: string,
    payload: {
      status: string;
      metadata: ComplianceTaskMetadata;
    }
  ) => Promise<void>;
  onApplicabilityChange: (task: ComplianceTaskRecord, applicable: boolean) => Promise<void>;
}) {
  const metadata = getTaskMetadata(task);
  const [draft, setDraft] = useState(() => buildDraft(task));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(buildDraft(task));
  }, [task]);

  const derivedState = getDerivedTaskState(task);
  const progress = getChecklistProgress({
    ...task,
    metadata: {
      ...metadata,
      checklist: draft.checklist,
    },
  });
  const dirty = JSON.stringify(draft) !== JSON.stringify(buildDraft(task));

  function updateChecklist(itemId: string) {
    setDraft((current) => ({
      ...current,
      checklist: current.checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    }));
  }

  function saveCurrentDraft() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const payload = {
          status: draft.completed ? "completed" : "upcoming",
          metadata: {
            ...metadata,
            applicable: draft.applicable,
            checklist: draft.checklist,
            filing: {
              ...metadata.filing,
              filedAt: draft.completed
                ? draft.filedAt || new Date().toISOString().split("T")[0]
                : null,
              filedMethod: draft.filedMethod || null,
              acknowledgementStatus: draft.acknowledgementStatus || null,
              acknowledgementReference: draft.acknowledgementReference.trim() || null,
              notes: draft.notes.trim() || null,
            },
          } satisfies ComplianceTaskMetadata,
        };

        try {
          await onSave(task.id, payload);
        } catch {
          setError("We couldn’t save this filing update.");
        }
      })();
    });
  }

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {CATEGORY_LABELS[task.category ?? "other"] ?? task.category ?? "Other"}
            </Badge>
            <Badge
              variant={derivedState === "overdue" ? "destructive" : "secondary"}
              className="capitalize"
            >
              {getTaskStatusLabel(derivedState)}
            </Badge>
            {metadata.optional ? (
              <Badge variant="secondary" className="bg-secondary/70">
                Optional
              </Badge>
            ) : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{task.title}</h3>
            {task.description ? (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{task.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Due {task.dueDate}</span>
            <span>
              Checklist {progress.completed}/{progress.total}
            </span>
            {draft.filedAt ? <span>Filed {draft.filedAt}</span> : null}
          </div>
        </div>

        {metadata.optional ? (
          <div className="rounded-2xl border border-border bg-secondary/50 p-4 xl:w-[320px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Does this apply?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {metadata.optionalPrompt ?? "Confirm whether this filing applies to your LLC."}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant={draft.applicable ? "secondary" : "outline"}
                onClick={() => void onApplicabilityChange(task, true)}
                disabled={isSaving || isPending}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={!draft.applicable ? "secondary" : "outline"}
                onClick={() => void onApplicabilityChange(task, false)}
                disabled={isSaving || isPending}
              >
                No, hide it
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-border bg-background/80 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Checklist</h4>
          </div>
          <div className="space-y-2">
            {draft.checklist.length > 0 ? (
              draft.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-border px-3 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.done)}
                    onChange={() => updateChecklist(item.id)}
                    className="mt-1 h-4 w-4 accent-[var(--primary)]"
                  />
                  <span>{item.label}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No checklist items yet. You can still record filing details below.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background/80 p-4">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Filing record</h4>
          </div>

          <div className="space-y-4">
            <label className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-border px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={draft.completed}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    completed: event.target.checked,
                    filedAt:
                      event.target.checked && !current.filedAt
                        ? new Date().toISOString().split("T")[0]
                        : current.filedAt,
                  }))
                }
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Mark this filing as submitted
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Filed on</span>
                <Input
                  type="date"
                  value={draft.filedAt}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, filedAt: event.target.value }))
                  }
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Method</span>
                <select
                  value={draft.filedMethod}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      filedMethod: event.target.value as FilingDraft["filedMethod"],
                    }))
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Select a method</option>
                  <option value="fax">Fax</option>
                  <option value="mail">Mail</option>
                  <option value="online">Online portal</option>
                  <option value="e-file">E-file</option>
                  <option value="phone">Phone</option>
                  <option value="manual">Manual / handed off</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Acknowledgement</span>
                <select
                  value={draft.acknowledgementStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      acknowledgementStatus:
                        event.target.value as FilingDraft["acknowledgementStatus"],
                    }))
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Not set</option>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="not_available">No acknowledgement available</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">
                  Fax confirmation / acknowledgement reference
                </span>
                <Input
                  value={draft.acknowledgementReference}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      acknowledgementReference: event.target.value,
                    }))
                  }
                  placeholder="Transmission ID, state receipt number, email ref..."
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Notes</span>
              <Textarea
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Anything worth remembering about the filing or follow-up."
                rows={3}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={saveCurrentDraft}
              disabled={!dirty || isSaving || isPending}
              className="btn-warm border-0"
            >
              {isSaving || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save filing details
            </Button>
            {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : null}
            {error ? <span className="text-sm text-destructive">{error}</span> : null}
          </div>
        </section>
      </div>
    </article>
  );
}

export function LlcFilingsTracker({
  llcId,
  llcName,
  initialTasks,
}: {
  llcId: string;
  llcName: string;
  initialTasks: ComplianceTaskRecord[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showHiddenOptional, setShowHiddenOptional] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hiddenOptionalCount = useMemo(
    () =>
      tasks.filter((task) => getTaskMetadata(task).optional && !isTaskVisible(task)).length,
    [tasks]
  );

  const visibleTasks = useMemo(
    () =>
      sortByDueDate(
        tasks.filter((task) => showHiddenOptional || isTaskVisible(task))
      ),
    [showHiddenOptional, tasks]
  );

  const openTasks = useMemo(
    () => visibleTasks.filter((task) => getDerivedTaskState(task) !== "completed"),
    [visibleTasks]
  );
  const completedTasks = useMemo(
    () => visibleTasks.filter((task) => getDerivedTaskState(task) === "completed"),
    [visibleTasks]
  );

  async function persistTask(
    taskId: string,
    payload: {
      status: string;
      metadata: ComplianceTaskMetadata;
    }
  ) {
    setSavingTaskId(taskId);
    setError(null);

    const response = await fetch(`/api/llcs/${llcId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setSavingTaskId(null);
      setError("We couldn’t update that filing.");
      throw new Error("Failed to update filing");
    }

    const updated = (await response.json()) as ComplianceTaskRecord;
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    setSavingTaskId(null);
  }

  async function handleApplicabilityChange(task: ComplianceTaskRecord, applicable: boolean) {
    const metadata = getTaskMetadata(task);
    await persistTask(task.id, {
      status: task.status ?? "upcoming",
      metadata: {
        ...metadata,
        applicable,
      },
    });
  }

  function renderTaskList(taskList: ComplianceTaskRecord[], emptyCopy: string) {
    if (taskList.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-10 text-center">
          <Clock3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {taskList.map((task) => (
          <FilingCard
            key={task.id}
            task={task}
            isSaving={savingTaskId === task.id}
            onSave={persistTask}
            onApplicabilityChange={handleApplicabilityChange}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            Filing tracker
          </p>
          <h1 className="heading-serif mt-2 text-3xl">Filings for {llcName}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Every filing now has a checklist, a filed date, a method, and a place to note the
            acknowledgement you received.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hiddenOptionalCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHiddenOptional((current) => !current)}
            >
              {showHiddenOptional ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showHiddenOptional ? "Hide skipped optional filings" : `Show skipped optional filings (${hiddenOptionalCount})`}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">Open filings</p>
          <p className="mt-1 text-3xl font-semibold">{openTasks.length}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">Filed</p>
          <p className="mt-1 text-3xl font-semibold">{completedTasks.length}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">Optional decisions</p>
          <p className="mt-1 text-3xl font-semibold">
            {tasks.filter((task) => getTaskMetadata(task).optional).length}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs defaultValue="open" className="gap-6">
        <TabsList variant="line">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="filed">Filed</TabsTrigger>
          <TabsTrigger value="all">All visible</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {renderTaskList(openTasks, "Nothing is currently waiting for action.")}
        </TabsContent>
        <TabsContent value="filed" className="space-y-4">
          {renderTaskList(completedTasks, "Filed items will appear here once you record them.")}
        </TabsContent>
        <TabsContent value="all" className="space-y-4">
          {renderTaskList(visibleTasks, "No filings are visible right now.")}
        </TabsContent>
      </Tabs>

      <div className="rounded-3xl border border-border bg-secondary/50 px-5 py-4 text-sm text-muted-foreground">
        Saying <span className="font-medium text-foreground">No, hide it</span> on an optional
        filing removes it from the main views. You can still reveal skipped optional filings later
        with the button above.
      </div>
    </div>
  );
}

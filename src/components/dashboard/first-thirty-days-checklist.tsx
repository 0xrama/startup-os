"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

type FilingPreferences = {
  remindDaysBefore: number;
  channels: ("email" | "whatsapp")[];
  checklists?: {
    first30Days?: Record<string, boolean>;
  };
};

export function FirstThirtyDaysChecklist({
  llcId,
  initialItems,
  initialPreferences,
}: {
  llcId: string;
  initialItems: ChecklistItem[];
  initialPreferences: FilingPreferences | null | undefined;
}) {
  const [items, setItems] = useState(initialItems);
  const [preferences, setPreferences] = useState<FilingPreferences>({
    remindDaysBefore: initialPreferences?.remindDaysBefore ?? 30,
    channels: initialPreferences?.channels ?? ["email"],
    checklists: initialPreferences?.checklists,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completedCount = items.filter((item) => item.checked).length;

  function persist(nextItems: ChecklistItem[]) {
    const nextPreferences: FilingPreferences = {
      ...preferences,
      checklists: {
        ...(preferences.checklists ?? {}),
        first30Days: Object.fromEntries(
          nextItems.map((item) => [item.id, item.checked])
        ),
      },
    };

    setPreferences(nextPreferences);
    setError(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/llcs/${llcId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filingPreferences: nextPreferences,
          }),
        });

        if (!response.ok) {
          setError("Could not save your checklist right now.");
        }
      })();
    });
  }

  function toggleItem(itemId: string) {
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(nextItems);
    persist(nextItems);
  }

  function markAllComplete() {
    const nextItems = items.map((item) => ({ ...item, checked: true }));
    setItems(nextItems);
    persist(nextItems);
  }

  return (
    <section className="card-elevated border border-border/70 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            First 30 days
          </p>
          <h2 className="heading-serif mt-2 text-2xl">Settle the essentials fast</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This replaces the old course. Keep the first month practical: confirm the basics,
            answer the optional filing questions, and save proof as you go.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-lg font-semibold">
              {completedCount}/{items.length}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={markAllComplete}
            disabled={completedCount === items.length || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mark all done
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleItem(item.id)}
            className={cn(
              "flex min-h-[88px] items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors",
              item.checked
                ? "border-primary/30 bg-primary/6"
                : "border-border bg-background hover:border-primary/30 hover:bg-secondary/50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border",
                item.checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              )}
            >
              {item.checked ? <CheckCircle2 className="h-4 w-4" /> : null}
            </span>
            <span className="text-sm leading-relaxed">{item.label}</span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

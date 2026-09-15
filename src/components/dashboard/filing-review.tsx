"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const reviewSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      facts: z.object({
        date: z.string(),
        relatedParty: z.string(),
        amount: z.string(),
        currency: z.string(),
        description: z.string(),
      }),
    })
  ),
  assessments: z.array(
    z.object({
      id: z.string(),
      reviewStatus: z.string(),
      ruleVersion: z.string(),
      reviewNotes: z.string().nullable(),
      snapshot: z
        .object({
          assessment: z
            .object({
              title: z.string(),
              summary: z.string(),
              dueDate: z.string().nullable(),
            })
            .passthrough(),
          warning: z.string(),
        })
        .passthrough(),
    })
  ),
});

type ReviewAction =
  | { action: "remove"; id: string; confirmed: true }
  | { action: "record"; facts: Record<string, FormDataEntryValue> }
  | { action: "assess"; taxYear: number }
  | {
      action: "review";
      id: string;
      notes: FormDataEntryValue | null;
      confirmed: true;
    };

export function FilingReview({ llcId }: { llcId: string }) {
  const [year, setYear] = useState(new Date().getUTCFullYear() - 1);
  const [data, setData] = useState<z.infer<typeof reviewSchema> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/llcs/${llcId}/review?year=${year}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) throw new Error("Could not load filing records.");

      const records = reviewSchema.parse(await response.json());

      if (!signal?.aborted) setData(records);
    },
    [llcId, year]
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setError("Could not load filing records.");
    });

    return () => controller.abort();
  }, [refresh]);

  async function submit(payload: ReviewAction) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/llcs/${llcId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error(
          "Could not save. Check all fields and the server encryption key."
        );

      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-warm p-6 my-6 space-y-4">
      <h2 className="font-semibold">Transaction facts and review</h2>
      <p className="text-sm">
        These records are readable by your server and encrypted in the database.
        A review records your decision, not professional approval. Snapshots
        remain unchanged when facts are later corrected.
      </p>
      <label className="block">
        Tax year
        <Input
          type="number"
          min={2000}
          max={2100}
          disabled={busy}
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit({
            action: "record",
            facts: Object.fromEntries(new FormData(event.currentTarget)),
          });
        }}
      >
        <label>
          Date
          <Input
            name="date"
            type="date"
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            required
          />
        </label>
        <label>
          Related party
          <Input name="relatedParty" required maxLength={200} />
        </label>
        <label>
          Relationship
          <select name="relationship" className="block border p-2">
            <option value="owner">Owner</option>
            <option value="related_entity">Related entity</option>
            <option value="other_related_party">Other related party</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" className="block border p-2">
            {[
              "contribution",
              "distribution",
              "loan",
              "repayment",
              "owner_paid_expense",
              "reimbursement",
              "sale",
              "service",
              "other",
            ].map((category) => (
              <option key={category} value={category}>
                {category.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select name="direction" className="block border p-2">
            <option value="received">Received</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        <label>
          Amount
          <Input
            name="amount"
            required
            pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
          />
        </label>
        <label>
          Currency
          <Input
            name="currency"
            required
            defaultValue="USD"
            pattern="[A-Z]{3}"
          />
        </label>
        <label>
          USD amount
          <Input
            name="usdAmount"
            required
            pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
          />
        </label>
        <label>
          Description
          <Input name="description" required maxLength={2000} />
        </label>
        <label>
          Evidence reference
          <Input name="evidenceReference" maxLength={300} />
        </label>
        <Button disabled={busy} type="submit">
          Record transaction
        </Button>
      </form>
      <ul>
        {data?.transactions.map((transaction) => (
          <li key={transaction.id}>
            {transaction.facts.date}: {transaction.facts.relatedParty},{" "}
            {transaction.facts.amount} {transaction.facts.currency},{" "}
            {transaction.facts.description}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Remove this fact from future assessments? Existing snapshots keep their original facts. You can then record a corrected transaction."
                  )
                ) {
                  void submit({
                    action: "remove",
                    id: transaction.id,
                    confirmed: true,
                  });
                }
              }}
            >
              Remove fact
            </Button>
          </li>
        ))}
      </ul>
      <Button
        disabled={busy}
        onClick={() => void submit({ action: "assess", taxYear: year })}
      >
        Freeze assessment snapshot
      </Button>
      {data?.assessments.map((assessment) => (
        <article key={assessment.id} className="border rounded p-3 space-y-2">
          <h3>{assessment.snapshot.assessment.title}</h3>
          <p>{assessment.snapshot.assessment.summary}</p>
          <p>
            Rule {assessment.ruleVersion}, {assessment.reviewStatus}. Due:{" "}
            {assessment.snapshot.assessment.dueDate ?? "Requires review"}.
          </p>
          <p>{assessment.snapshot.warning}</p>
          <p>
            Download and check the complete facts before recording your review.
          </p>
          {assessment.reviewNotes ? (
            <p>Review notes: {assessment.reviewNotes}</p>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(assessment, null, 2)], {
                type: "application/json",
              });

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `assessment-${assessment.id}.json`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download snapshot
          </Button>
          {assessment.reviewStatus === "unreviewed" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const notes = new FormData(event.currentTarget).get("notes");
                void submit({
                  action: "review",
                  id: assessment.id,
                  notes,
                  confirmed: true,
                });
              }}
            >
              <label>
                Review notes
                <Input name="notes" required maxLength={2000} />
              </label>
              <Button disabled={busy} type="submit">
                Record my review
              </Button>
            </form>
          ) : null}
        </article>
      ))}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const statusSchema = z.object({
  counts: z.array(z.object({ status: z.string(), count: z.number() })),
  activeWorkers: z.number(),
  attention: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      lastError: z.string().nullable(),
    })
  ),
});

export function OperationsPanel() {
  const [status, setStatus] = useState<z.infer<typeof statusSchema> | null>(
    null
  );
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/operations", { cache: "no-store" });

      if (!response.ok) throw new Error("Could not load worker status.");

      setStatus(statusSchema.parse(await response.json()));
      setError("");
    } catch {
      setError("Could not load worker status.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function retry(id: string) {
    if (
      !confirm(
        "Retry this failed job? Check delivery history before retrying a reminder."
      )
    )
      return;

    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, confirmed: true }),
      });

      if (!response.ok)
        throw new Error(
          "Sign in again, or inspect the failed delivery before retrying. Document analysis must be re-submitted from the vault."
        );

      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Retry failed.");
    }
  }

  return (
    <section className="card-warm p-6 mt-6 space-y-3">
      <h2 className="font-semibold">Background work</h2>
      <Button variant="outline" onClick={() => void refresh()}>
        Refresh status
      </Button>
      {error ? <p role="alert">{error}</p> : null}
      {status ? (
        <>
          <p>
            {status.activeWorkers
              ? `${status.activeWorkers} active worker(s)`
              : "No recent worker heartbeat. Start pnpm worker."}
          </p>
          <p>
            {status.counts
              .map((count) => `${count.status}: ${count.count}`)
              .join(", ") || "No jobs yet."}
          </p>
          <ul className="space-y-2">
            {status.attention.map((job) => (
              <li key={job.id}>
                {job.kind}: {job.lastError}
                {job.kind !== "document.analyze" ? (
                  <Button variant="ghost" onClick={() => void retry(job.id)}>
                    Retry
                  </Button>
                ) : (
                  <span> Re-submit from Documents.</span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

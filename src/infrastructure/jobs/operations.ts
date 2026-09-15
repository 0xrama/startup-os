import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, reminders, workerHeartbeats } from "@/lib/schema";
import { openJobPayload } from "./contracts";

export async function getOperationsStatus() {
  const [counts, workers, attention] = await Promise.all([
    db
      .select({ status: jobs.status, count: sql<number>`count(*)::int` })
      .from(jobs)
      .groupBy(jobs.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workerHeartbeats)
      .where(
        gt(workerHeartbeats.lastSeenAt, new Date(Date.now() - 5 * 60_000))
      ),
    db
      .select({
        id: jobs.id,
        kind: jobs.kind,
        status: jobs.status,
        attempts: jobs.attempts,
        lastError: jobs.lastError,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.status, "failed"))
      .orderBy(desc(jobs.createdAt))
      .limit(50),
  ]);

  return { counts, activeWorkers: workers[0].count, attention };
}

export async function retryFailedJob(id: string) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, id))
      .for("update");

    if (!job || job.status !== "failed") return false;

    const payload = openJobPayload(job.payload);

    // Staging bytes expire. A new document submission records fresh consent.
    if (payload.type === "document.analyze") return false;

    if (payload.type === "reminder.deliver") {
      const [reminder] = await tx
        .update(reminders)
        .set({ status: "pending", lastError: null })
        .where(
          and(
            eq(reminders.id, payload.reminderId),
            eq(reminders.status, "failed")
          )
        )
        .returning({ id: reminders.id });

      // Unknown deliveries must be reconciled with the provider, not resent.
      if (!reminder) return false;
    }

    await tx
      .update(jobs)
      .set({
        status: "queued",
        attempts: 0,
        availableAt: new Date(),
        finishedAt: null,
        lastError: null,
        leaseUntil: null,
        leaseToken: null,
      })
      .where(eq(jobs.id, id));

    return true;
  });
}

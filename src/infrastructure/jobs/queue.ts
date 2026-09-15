import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, reminders } from "@/lib/schema";
import {
  claimedJobSchema,
  jobTargetId,
  JOB_LEASE_MS,
  openJobPayload,
  retryDelayMs,
  sealJobPayload,
  type ClaimedJob,
  type JobPayload,
} from "./contracts";

export type JobWriter = Pick<typeof db, "insert">;

export async function enqueueJob(
  payload: JobPayload,
  dedupeKey: string,
  options: { userId?: string; availableAt?: Date; id?: string } = {},
  database: JobWriter = db
) {
  const [job] = await database
    .insert(jobs)
    .values({
      id: options.id,
      kind: payload.type,
      targetId: jobTargetId(payload),
      payload: sealJobPayload(payload),
      dedupeKey,
      userId: options.userId,
      availableAt: options.availableAt ?? new Date(),
    })
    .onConflictDoNothing({ target: jobs.dedupeKey })
    .returning({ id: jobs.id });

  return job;
}

export async function claimJob() {
  const token = crypto.randomUUID();

  const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id FROM jobs
      WHERE ((status = 'queued' AND available_at <= now())
        OR (status = 'running' AND lease_until < now()))
        AND attempts < max_attempts
      ORDER BY available_at, created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE jobs SET status = 'running', attempts = attempts + 1,
      lease_token = ${token}, lease_until = now() + ${JOB_LEASE_MS} * interval '1 millisecond'
    FROM candidate WHERE jobs.id = candidate.id
    RETURNING jobs.id, payload, attempts, max_attempts, lease_token
  `);

  return result.rows[0] ? claimedJobSchema.parse(result.rows[0]) : null;
}

export async function renewLease(job: ClaimedJob) {
  const rows = await db
    .update(jobs)
    .set({ leaseUntil: new Date(Date.now() + JOB_LEASE_MS) })
    .where(
      and(
        eq(jobs.id, job.id),
        eq(jobs.leaseToken, job.lease_token),
        eq(jobs.status, "running"),
        gt(jobs.leaseUntil, new Date())
      )
    )
    .returning({ id: jobs.id });

  return rows.length === 1;
}

export async function finishJob(job: ClaimedJob, success: boolean) {
  const exhausted = job.attempts >= job.max_attempts;

  await db.transaction(async (tx) => {
    const [finished] = await tx
      .update(jobs)
      .set({
        status: success ? "completed" : exhausted ? "failed" : "queued",
        availableAt: new Date(Date.now() + retryDelayMs(job.attempts)),
        leaseUntil: null,
        leaseToken: null,
        finishedAt: success || exhausted ? new Date() : null,
        lastError: success
          ? null
          : "Job failed. Check provider configuration and retry.",
      })
      .where(
        and(
          eq(jobs.id, job.id),
          eq(jobs.leaseToken, job.lease_token),
          eq(jobs.status, "running"),
          gt(jobs.leaseUntil, new Date())
        )
      )
      .returning({ id: jobs.id });

    if (
      finished &&
      !success &&
      exhausted &&
      job.payload.type === "reminder.deliver"
    ) {
      await tx
        .update(reminders)
        .set({
          status: sql`CASE WHEN ${reminders.status} = 'processing' THEN 'delivery_unknown' ELSE 'failed' END`,
        })
        .where(
          and(
            eq(reminders.id, job.payload.reminderId),
            sql`${reminders.status} IN ('pending', 'processing')`
          )
        );
    }
  });
}

export async function recoverExhaustedJobs() {
  await db.execute(sql`
    WITH exhausted AS (UPDATE jobs SET status = 'failed', finished_at = now(), lease_token = NULL,
      last_error = 'Worker stopped before completion; retry requires review.'
    WHERE status = 'running' AND lease_until < now() AND attempts >= max_attempts
    RETURNING kind, target_id)
    UPDATE reminders SET status = CASE WHEN status = 'processing' THEN 'delivery_unknown' ELSE 'failed' END
    WHERE id IN (SELECT target_id FROM exhausted WHERE kind = 'reminder.deliver')
    AND status IN ('pending', 'processing')
  `);
}

export async function encryptLegacyJobPayloads() {
  const rows = await db
    .select({ id: jobs.id, payload: jobs.payload })
    .from(jobs)
    .where(sql`${jobs.payload} NOT LIKE 'sealed:v1:%'`)
    .limit(100);

  for (const row of rows) {
    await db
      .update(jobs)
      .set({ payload: sealJobPayload(openJobPayload(row.payload)) })
      .where(and(eq(jobs.id, row.id), eq(jobs.payload, row.payload)));
  }
}

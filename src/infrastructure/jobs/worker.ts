import { z } from "zod";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, workerHeartbeats, operationEvents } from "@/lib/schema";
import { getObjectBytes, deleteObject } from "@/lib/r2";
import { openBytes, openText } from "../security/server-encryption";
import { processDocumentIntelligence } from "@/lib/document-intelligence";
import {
  deliverReminder,
  enqueueDueReminders,
} from "@/modules/notifications/reminders";
import { expireDocumentAnalysis } from "@/modules/documents/lifecycle";
import {
  claimJob,
  encryptLegacyJobPayloads,
  enqueueJob,
  finishJob,
  recoverExhaustedJobs,
  renewLease,
} from "./queue";
import type { ClaimedJob } from "./contracts";
import { DOCUMENT_MAX_BYTES } from "@/lib/ai-limits";

const metadataSchema = z.object({ name: z.string(), type: z.string() });

async function executeJob(job: ClaimedJob, signal: AbortSignal) {
  const payload = job.payload;

  if (payload.type === "object.delete") {
    await deleteObject(payload.key, signal);
  } else if (payload.type === "reminder.deliver") {
    await deliverReminder(payload.reminderId);
  } else {
    const metadata = metadataSchema.parse(
      JSON.parse(openText(payload.encryptedMetadata))
    );

    const bytes = openBytes(
      await getObjectBytes(payload.stagingKey, DOCUMENT_MAX_BYTES + 32, signal)
    );

    await processDocumentIntelligence(
      payload.documentId,
      { body: bytes, name: metadata.name, type: metadata.type },
      signal,
      undefined,
      job.id,
      job.lease_token
    );

    try {
      await enqueueJob(
        { type: "object.delete", key: payload.stagingKey },
        `analysis-cleanup:${job.id}`
      );
    } catch {
      // The 24-hour expiry job remains the cleanup fallback.
    }
  }
}

export async function processOneJob() {
  const job = await claimJob();

  if (!job) return false;

  const controller = new AbortController();
  const started = Date.now();

  const interval = setInterval(() => {
    void renewLease(job)
      .then((owned) => {
        if (!owned) controller.abort();
      })
      .catch(() => controller.abort());
  }, 30_000);

  let success = false;

  try {
    await executeJob(
      job,
      AbortSignal.any([controller.signal, AbortSignal.timeout(240_000)])
    );
    success = !controller.signal.aborted;
  } catch {
    // Payloads and provider errors may contain private document content.
  } finally {
    clearInterval(interval);
    await finishJob(job, success);
    await db.insert(operationEvents).values({
      kind: job.payload.type,
      status: success ? "success" : "failed",
      durationMs: Date.now() - started,
    });
  }

  return true;
}

export async function maintainWorker(workerId: string) {
  await db
    .insert(workerHeartbeats)
    .values({ id: workerId })
    .onConflictDoUpdate({
      target: workerHeartbeats.id,
      set: { lastSeenAt: new Date() },
    });
  await encryptLegacyJobPayloads();
  await recoverExhaustedJobs();
  await enqueueDueReminders();
  await expireDocumentAnalysis();
  await pruneFinishedWork();
  await db
    .delete(workerHeartbeats)
    .where(
      lt(workerHeartbeats.lastSeenAt, new Date(Date.now() - 24 * 60 * 60_000))
    );
}

// Failed work stays available for operator review. Never silently discard
// failed object deletions, or their only remaining storage reference is lost.
export async function pruneFinishedWork() {
  await db
    .delete(jobs)
    .where(
      and(
        inArray(jobs.status, ["completed", "cancelled"]),
        lt(jobs.finishedAt, new Date(Date.now() - 7 * 24 * 60 * 60_000))
      )
    );
  await db
    .delete(operationEvents)
    .where(
      lt(
        operationEvents.createdAt,
        new Date(Date.now() - 90 * 24 * 60 * 60_000)
      )
    );
}

export async function stopWorker(workerId: string) {
  await db.delete(workerHeartbeats).where(eq(workerHeartbeats.id, workerId));
}

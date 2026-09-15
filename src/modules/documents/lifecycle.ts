import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, jobs, knowledgeChunks, noticeCases } from "@/lib/schema";
import { enqueueJob } from "@/infrastructure/jobs/queue";
import {
  sealBytes,
  sealText,
} from "@/infrastructure/security/server-encryption";
import { getObjectBytes, putObjectBytes } from "@/lib/r2";
import { DOCUMENT_MAX_BYTES } from "@/lib/ai-limits";
import { openJobPayload } from "@/infrastructure/jobs/contracts";

export const ANALYSIS_CONSENT_VERSION = "2026-09-15";

const STAGING_RESERVATION_MS = 10 * 60_000;

export async function enqueueDocumentAnalysis(
  documentId: string,
  readableFile?: File
) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (!doc) throw new Error("Document not found");

  if (doc.wrappedFileKey && !readableFile)
    throw new Error("Unlock and submit a readable copy");

  const jobId = crypto.randomUUID();
  const stagingKey = `processing/${doc.userId}/${jobId}`;

  const encryptedMetadata = sealText(
    JSON.stringify({
      name: readableFile?.name ?? doc.name,
      type: readableFile?.type ?? doc.fileType ?? "application/octet-stream",
    })
  );

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: documents.id, jobId: documents.analysisJobId })
      .from(documents)
      .where(eq(documents.id, documentId))
      .for("update");

    if (!current) throw new Error("Document was deleted");

    if (current.jobId) {
      const [active] = await tx
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, current.jobId));

      if (active && ["queued", "running"].includes(active.status))
        throw new Error("Analysis is already active");
    }

    await enqueueJob(
      { type: "document.analyze", documentId, stagingKey, encryptedMetadata },
      `analyze:${jobId}`,
      {
        id: jobId,
        userId: doc.userId,
        availableAt: new Date(Date.now() + STAGING_RESERVATION_MS),
      },
      tx
    );

    await tx
      .update(documents)
      .set({
        analysisJobId: jobId,
        analysisConsentVersion: ANALYSIS_CONSENT_VERSION,
        analysisConsentAt: new Date(),
        analysisExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
        processingStatus: "queued",
        processingError: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  });

  try {
    const bytes = readableFile
      ? new Uint8Array(await readableFile.arrayBuffer())
      : await getObjectBytes(doc.fileKey);

    if (bytes.byteLength > DOCUMENT_MAX_BYTES)
      throw new Error("File too large");

    // Even an interrupted upload has a durable expiry job.
    await enqueueJob(
      { type: "object.delete", key: stagingKey },
      `expire:${stagingKey}`,
      { availableAt: new Date(Date.now() + 24 * 60 * 60_000) }
    );
    await putObjectBytes(stagingKey, sealBytes(bytes));

    const [activated] = await db
      .update(jobs)
      .set({ availableAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.status, "queued")))
      .returning({ id: jobs.id });

    if (!activated) throw new Error("Analysis reservation expired");

    return { status: "queued" as const, jobId };
  } catch (error) {
    await db
      .transaction(async (tx) => {
        await tx
          .update(jobs)
          .set({
            status: "cancelled",
            finishedAt: new Date(),
          })
          .where(and(eq(jobs.id, jobId), eq(jobs.status, "queued")));
        await tx
          .update(documents)
          .set({
            analysisJobId: null,
            processingStatus: "failed",
            processingError: "Could not stage the document for analysis.",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(documents.id, documentId),
              eq(documents.analysisJobId, jobId)
            )
          );
      })
      .catch(() => undefined);

    throw error;
  }
}

type DocumentTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function revokeDocumentAnalysis(
  documentId: string,
  database?: DocumentTransaction,
  expiredBefore?: Date
): Promise<void> {
  const revoke = async (tx: DocumentTransaction) => {
    const [doc] = await tx
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .for("update");

    if (!doc) return;

    if (
      expiredBefore &&
      (!doc.analysisExpiresAt || doc.analysisExpiresAt > expiredBefore)
    )
      return;

    if (doc.analysisJobId) {
      const [job] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, doc.analysisJobId));

      if (job) {
        const payload = openJobPayload(job.payload);

        if (payload.type === "document.analyze") {
          await enqueueJob(
            { type: "object.delete", key: payload.stagingKey },
            `revoke:${job.id}`,
            {},
            tx
          );
        }
      }

      await tx
        .update(jobs)
        .set({
          status: "cancelled",
          leaseToken: null,
          leaseUntil: null,
          finishedAt: new Date(),
        })
        .where(eq(jobs.id, doc.analysisJobId));
    }

    await tx
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.documentId, documentId));
    await tx
      .delete(noticeCases)
      .where(
        and(
          eq(noticeCases.documentId, documentId),
          inArray(noticeCases.status, ["ready", "processing"])
        )
      );

    await tx
      .update(documents)
      .set({
        analysisConsentAt: null,
        analysisConsentVersion: null,
        analysisExpiresAt: null,
        analysisJobId: null,
        extractedMetadata: null,
        documentType: null,
        processingStatus: "skipped",
        extractedTextStatus: "skipped",
        processingError: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  };

  if (database) await revoke(database);
  else await db.transaction(revoke);
}

export async function deleteDocument(documentId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .for("update");

    if (!doc) return false;

    await revokeDocumentAnalysis(documentId, tx);
    await enqueueJob(
      { type: "object.delete", key: doc.fileKey },
      `delete-document:${doc.id}`,
      { availableAt: new Date(Date.now() + 24 * 60 * 60_000) },
      tx
    );
    await tx
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.sourceId, doc.id));
    await tx.delete(documents).where(eq(documents.id, doc.id));

    return true;
  });
}

export async function expireDocumentAnalysis() {
  const expiredBefore = new Date();

  const expired = await db
    .select({ id: documents.id })
    .from(documents)
    .where(lt(documents.analysisExpiresAt, expiredBefore))
    .limit(50);

  for (const doc of expired)
    await revokeDocumentAnalysis(doc.id, undefined, expiredBefore);

  // Cancelled or expired jobs cannot recreate extracted content after revocation.
  await db.execute(sql`UPDATE documents SET processing_status = 'failed'
    WHERE analysis_job_id IN (SELECT id FROM jobs WHERE status = 'failed')
    AND processing_status IN ('queued', 'processing')`);
}

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appSettings,
  auditLogs,
  chatConversations,
  documents,
  jobs,
  knowledgeChunks,
  llcs,
  user,
  userEncryption,
  verification,
} from "@/lib/schema";
import { enqueueJob } from "@/infrastructure/jobs/queue";
import { openJobPayload } from "@/infrastructure/jobs/contracts";

export async function deleteAccount(userId: string) {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .for("update");

    if (!owner) return;

    // Block document inserts through their LLC foreign key before collecting
    // object keys. Entity creation also holds the owner row lock.
    await tx
      .select({ id: llcs.id })
      .from(llcs)
      .where(eq(llcs.userId, userId))
      .for("update");

    const files = await tx
      .select({ id: documents.id, key: documents.fileKey })
      .from(documents)
      .where(eq(documents.userId, userId))
      .for("update");

    const pending = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .for("update");

    for (const job of pending) {
      const payload = openJobPayload(job.payload);

      if (payload.type === "document.analyze") {
        await enqueueJob(
          { type: "object.delete", key: payload.stagingKey },
          `account-stage:${job.id}`,
          {},
          tx
        );
      }
    }

    for (const file of files) {
      await enqueueJob(
        { type: "object.delete", key: file.key },
        `account-file:${file.id}`,
        { availableAt: new Date(Date.now() + 24 * 60 * 60_000) },
        tx
      );
    }

    await tx
      .delete(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          inArray(jobs.kind, ["document.analyze", "reminder.deliver"])
        )
      );

    const ownedLlcs = tx
      .select({ id: llcs.id })
      .from(llcs)
      .where(eq(llcs.userId, userId));

    // Include legacy chunks without a document foreign key.
    await tx.delete(knowledgeChunks).where(
      inArray(
        knowledgeChunks.sourceId,
        files.map((file) => file.id)
      )
    );
    await tx.delete(llcs).where(inArray(llcs.id, ownedLlcs));
    await tx
      .delete(chatConversations)
      .where(eq(chatConversations.userId, userId));
    await tx.delete(auditLogs).where(eq(auditLogs.userId, userId));
    await tx.delete(userEncryption).where(eq(userEncryption.userId, userId));
    await tx.delete(verification);
    await tx.delete(appSettings);
    await tx.delete(user).where(eq(user.id, userId));
  });
}

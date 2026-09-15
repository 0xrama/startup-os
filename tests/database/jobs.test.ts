import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  complianceTasks,
  documents,
  jobs,
  llcs,
  reminders,
  appSettings,
  user,
} from "@/lib/schema";
import {
  claimJob,
  enqueueJob,
  finishJob,
  encryptLegacyJobPayloads,
  recoverExhaustedJobs,
  renewLease,
} from "@/infrastructure/jobs/queue";
import { enqueueDueReminders } from "@/modules/notifications/reminders";
import { retryFailedJob } from "@/infrastructure/jobs/operations";
import { pruneFinishedWork } from "@/infrastructure/jobs/worker";
import { revokeDocumentAnalysis } from "@/modules/documents/lifecycle";
import { deleteAccount } from "@/modules/identity/delete-account";
import {
  createAssessment,
  listAssessments,
  listTransactions,
  recordTransaction,
  removeTransaction,
  reviewAssessment,
} from "@/modules/compliance/records";
import { searchKnowledgeBase, storeKnowledgeChunks } from "@/lib/knowledge";
import {
  processDocumentIntelligence,
  documentIntelligenceServices,
} from "@/lib/document-intelligence";
import { getAiConfig } from "@/lib/ai-config";
import { isSealedText } from "@/infrastructure/security/server-encryption";
import { openJobPayload } from "@/infrastructure/jobs/contracts";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE jobs, llcs, "user", app_settings, worker_heartbeats, operation_events CASCADE`
  );
  await db.insert(user).values({ id: "owner", email: "owner@example.test" });
  await db.insert(llcs).values({
    id: "entity",
    userId: "owner",
    name: "Test LLC",
    state: "WY",
    entityType: "single-member",
  });
  await db.insert(complianceTasks).values({
    id: "task",
    llcId: "entity",
    title: "Test",
    dueDate: "2020-01-01",
  });
});

afterAll(async () => {
  await db.$client.end();
});

describe("durable jobs on PostgreSQL", () => {
  it("encrypts queued payloads and lazily seals a legacy AI key", async () => {
    await enqueueJob(
      { type: "object.delete", key: "private-object-key" },
      "encrypted-payload"
    );
    const [job] = await db.select().from(jobs);

    expect(isSealedText(job.payload)).toBe(true);
    expect(openJobPayload(job.payload)).toEqual({
      type: "object.delete",
      key: "private-object-key",
    });

    await db.insert(jobs).values({
      id: "legacy-job",
      kind: "object.delete",
      payload: JSON.stringify({
        type: "object.delete",
        key: "legacy-private-key",
      }),
      dedupeKey: "legacy-job",
    });
    await encryptLegacyJobPayloads();
    expect(
      isSealedText(
        (
          await db.query.jobs.findFirst({
            where: eq(jobs.id, "legacy-job"),
          })
        )?.payload ?? ""
      )
    ).toBe(true);

    await db.insert(appSettings).values({
      id: "singleton",
      aiBaseUrl: "http://localhost:11434/v1",
      aiModel: "local",
      aiApiKey: "legacy-plaintext-key",
    });
    expect((await getAiConfig()).apiKey).toBe("legacy-plaintext-key");
    expect(
      isSealedText((await db.query.appSettings.findFirst())?.aiApiKey ?? "")
    ).toBe(true);
  });

  it("parks a legacy processing reminder that has no delivery job", async () => {
    await db.insert(reminders).values({
      id: "legacy-processing",
      taskId: "task",
      userId: "owner",
      channel: "email",
      scheduledAt: new Date(0),
      status: "processing",
    });

    await enqueueDueReminders();

    expect((await db.query.reminders.findFirst())?.status).toBe(
      "delivery_unknown"
    );
  });

  it("allows exactly one owner across concurrent signup requests", async () => {
    await db.execute(sql`TRUNCATE jobs, llcs, "user" CASCADE`);

    const signUp = (email: string) =>
      auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({
            name: email,
            email,
            password: "test-only-strong-password-94!",
          }),
        })
      );

    const responses = await Promise.all([
      signUp("first@example.test"),
      signUp("second@example.test"),
    ]);

    expect(responses.filter((response) => response.ok)).toHaveLength(1);
    expect(await db.select().from(user)).toHaveLength(1);
  });

  it("blocks expired extracted content without depending on maintenance", async () => {
    await db.insert(documents).values({
      id: "expired",
      userId: "owner",
      llcId: "entity",
      name: "File",
      fileKey: "test",
      analysisConsentAt: new Date(),
      analysisExpiresAt: new Date(0),
    });
    await storeKnowledgeChunks({
      source: "test",
      sourceId: "expired",
      chunks: ["Special deadline for widgets"],
      metadata: {
        kind: "user_document",
        documentId: "expired",
        llcId: "entity",
      },
    });
    expect(
      await searchKnowledgeBase({ query: "widgets", llcId: "entity" })
    ).toHaveLength(0);
    await db
      .update(documents)
      .set({ analysisExpiresAt: new Date(Date.now() + 60_000) });
    expect(
      await searchKnowledgeBase({ query: "widgets", llcId: "entity" })
    ).toHaveLength(1);
  });

  it("does not let a stale analysis attempt overwrite a replacement's result", async () => {
    const queued = await enqueueJob(
      {
        type: "document.analyze",
        documentId: "doc",
        stagingKey: "test",
        encryptedMetadata: "test",
      },
      "analysis-fence"
    );

    if (!queued) throw new Error("Expected analysis");

    await db.insert(documents).values({
      id: "doc",
      userId: "owner",
      llcId: "entity",
      name: "File",
      fileKey: "test",
      analysisJobId: queued.id,
      analysisConsentAt: new Date(),
      analysisExpiresAt: new Date(Date.now() + 60_000),
    });
    const first = await claimJob();

    if (!first) throw new Error("Expected first claim");

    const blocked = Promise.withResolvers<{
      documentType: string;
      summary: string;
    }>();

    const started = Promise.withResolvers<void>();

    const oldAttempt = processDocumentIntelligence(
      "doc",
      new File(["Records"], "file.txt", { type: "text/plain" }),
      undefined,
      {
        ...documentIntelligenceServices,
        classifyExtractedText: () => {
          started.resolve();

          return blocked.promise;
        },
      },
      first.id,
      first.lease_token
    );

    const observedFailure = oldAttempt.catch(() => undefined);
    await started.promise;
    await db
      .update(jobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(jobs.id, queued.id));
    const replacement = await claimJob();

    if (!replacement) throw new Error("Expected replacement");

    await processDocumentIntelligence(
      "doc",
      new File(["Records"], "file.txt", { type: "text/plain" }),
      undefined,
      {
        ...documentIntelligenceServices,
        classifyExtractedText: async () => ({
          documentType: "other",
          summary: "New result",
        }),
      },
      replacement.id,
      replacement.lease_token
    );
    blocked.reject(new Error("Old attempt failed"));
    await observedFailure;
    expect((await db.query.documents.findFirst())?.processingStatus).toBe(
      "ready"
    );
  });
  it("claims a job once across concurrent workers and rejects stale completion", async () => {
    await enqueueJob({ type: "object.delete", key: "test" }, "once");
    await enqueueJob({ type: "object.delete", key: "test" }, "once");

    const claimed = (
      await Promise.all([claimJob(), claimJob(), claimJob()])
    ).filter((job) => job !== null);

    expect(claimed).toHaveLength(1);

    const job = claimed[0];
    await db
      .update(jobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(jobs.id, job.id));
    expect(await renewLease(job)).toBe(false);

    const replacement = await claimJob();
    expect(replacement?.attempts).toBe(2);
    await finishJob(job, true);
    expect((await db.query.jobs.findFirst())?.status).toBe("running");

    if (!replacement) throw new Error("Expected lease recovery");

    await finishJob(replacement, true);
    expect((await db.query.jobs.findFirst())?.status).toBe("completed");
  });

  it("parks exhausted reminders without resetting their retry budget", async () => {
    await db.insert(reminders).values({
      id: "reminder",
      taskId: "task",
      userId: "owner",
      channel: "email",
      scheduledAt: new Date(0),
      idempotencyKey: "reminder-key",
    });
    await enqueueDueReminders();
    await enqueueDueReminders();
    expect(await db.select().from(jobs)).toHaveLength(1);

    await db.update(jobs).set({ attempts: 2 });
    const job = await claimJob();

    if (!job) throw new Error("Expected reminder claim");

    await finishJob(job, false);
    await enqueueDueReminders();
    expect((await db.query.jobs.findFirst())?.status).toBe("failed");
    expect((await db.query.reminders.findFirst())?.status).toBe("failed");
    expect(await claimJob()).toBeNull();
    expect(await retryFailedJob(job.id)).toBe(true);
    expect((await claimJob())?.attempts).toBe(1);
  });

  it("never automatically resends a crashed uncertain delivery", async () => {
    await db.insert(reminders).values({
      id: "uncertain",
      taskId: "task",
      userId: "owner",
      channel: "email",
      scheduledAt: new Date(0),
      status: "processing",
    });

    const queued = await enqueueJob(
      { type: "reminder.deliver", reminderId: "uncertain" },
      "uncertain"
    );

    if (!queued) throw new Error("Expected queued job");

    await db
      .update(jobs)
      .set({ status: "running", attempts: 3, leaseUntil: new Date(0) });
    await recoverExhaustedJobs();
    expect((await db.query.reminders.findFirst())?.status).toBe(
      "delivery_unknown"
    );
    expect(await retryFailedJob(queued.id)).toBe(false);
  });

  it("retains failed cleanup jobs until reviewed", async () => {
    await enqueueJob(
      { type: "object.delete", key: "only-reference" },
      "cleanup"
    );
    await db.update(jobs).set({ status: "failed", finishedAt: new Date(0) });
    await pruneFinishedWork();
    expect(await db.select().from(jobs)).toHaveLength(1);
  });

  it("revokes analysis atomically and keeps object cleanup after account deletion", async () => {
    await db.insert(documents).values({
      id: "document",
      userId: "owner",
      llcId: "entity",
      name: "Encrypted file",
      fileKey: "vault-test",
    });

    const job = await enqueueJob(
      {
        type: "document.analyze",
        documentId: "document",
        stagingKey: "staging-test",
        encryptedMetadata: "test",
      },
      "analysis",
      { userId: "owner" }
    );

    if (!job) throw new Error("Expected analysis");

    await db.update(documents).set({
      analysisJobId: job.id,
      analysisConsentAt: new Date(),
      extractedMetadata: { summary: "sensitive" },
    });
    await revokeDocumentAnalysis("document");
    expect(
      (await db.query.documents.findFirst())?.extractedMetadata
    ).toBeNull();
    expect(
      (await db.query.jobs.findFirst({ where: eq(jobs.id, job.id) }))
        ?.finishedAt
    ).not.toBeNull();
    await deleteAccount("owner");
    expect(await db.select().from(documents)).toHaveLength(0);
    const remaining = await db.select().from(jobs);
    expect(remaining.every((row) => row.kind === "object.delete")).toBe(true);
    expect(
      remaining.some((row) =>
        JSON.stringify(openJobPayload(row.payload)).includes("vault-test")
      )
    ).toBe(true);
  });

  it("freezes encrypted facts, preserves snapshots after removal, and records one review", async () => {
    const transaction = await recordTransaction("entity", {
      date: "2025-02-01",
      relatedParty: "Owner",
      relationship: "owner",
      category: "contribution",
      direction: "received",
      amount: "100.00",
      currency: "USD",
      usdAmount: "100.00",
      description: "Initial capital",
    });

    const assessment = await createAssessment("entity", 2025);
    await removeTransaction("entity", transaction.id);
    expect(await listTransactions("entity", 2025)).toHaveLength(0);
    expect(
      await reviewAssessment(
        "entity",
        assessment.id,
        "Checked against statements"
      )
    ).toHaveLength(1);
    expect(
      await reviewAssessment("entity", assessment.id, "Changed")
    ).toHaveLength(0);
    const replacement = await createAssessment("entity", 2025);
    const [replacementSaved, saved] = await listAssessments("entity", 2025);
    expect(saved.reviewStatus).toBe("user_reviewed");
    expect(JSON.stringify(saved.snapshot)).toContain("Initial capital");
    expect(replacementSaved.id).toBe(replacement.id);
    expect(JSON.stringify(replacementSaved.snapshot)).not.toContain(
      "Initial capital"
    );
  });
});

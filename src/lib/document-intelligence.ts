import { generateObject } from "ai";
import { z } from "zod";
import { and, eq, ne, isNull, or, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { getObjectBytes } from "./r2";
import { documents, jobs, noticeCases } from "./schema";
import { getChatModel } from "./ai-config";
import { extractDocumentText } from "@/modules/documents/parser";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_TIMEOUT_MS,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MAX_TEXT_CHARS,
} from "./ai-limits";
import {
  chunkText,
  deleteKnowledgeChunksBySource,
  storeKnowledgeChunks,
} from "./knowledge";
import { noticeDueDateSchema } from "@/modules/compliance/notice-task";

const extractionSchema = z.object({
  documentType: z.string().default("other"),
  summary: z.string().default(""),
  issuer: z.string().optional(),
  noticeNumber: z.string().optional(),
  dueDate: noticeDueDateSchema.optional(),
  amountDue: z.string().optional(),
  taxYear: z.number().optional(),
  entityName: z.string().optional(),
  state: z.string().optional(),
  issueDate: z.string().optional(),
  formName: z.string().optional(),
  members: z.array(z.string()).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  proposedTaskTitle: z.string().optional(),
  proposedTaskDescription: z.string().optional(),
});

type DocumentDatabase = Pick<
  typeof db,
  "query" | "select" | "insert" | "update" | "delete"
>;

type ReadableDocument =
  | File
  | {
      body: Buffer;
      name: string;
      type: string;
    };

async function extractTextFromDocument(
  bytes: Buffer,
  fileType: string | null,
  signal: AbortSignal
) {
  if (fileType === "application/pdf") {
    return extractDocumentText(bytes, fileType, signal);
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocumentText(bytes, fileType, signal);
  }

  if (fileType === "application/msword") {
    throw new Error(
      "Convert legacy Word documents to PDF or DOCX before analysis."
    );
  }

  if (fileType?.startsWith("text/")) {
    return bytes.toString("utf8").trim();
  }

  if (fileType?.startsWith("image/")) {
    const mimeType = fileType;

    const result = await generateObject({
      model: await getChatModel(),
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      abortSignal: signal,
      schema: z.object({
        text: z.string().default(""),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text from this document image.",
            },
            { type: "image", image: bytes, mediaType: mimeType },
          ],
        },
      ],
    });

    return result.object.text.trim();
  }

  throw new Error("Unsupported document type");
}

async function classifyExtractedText(text: string, signal: AbortSignal) {
  if (!text.trim()) {
    return {
      documentType: "other",
      summary: "",
    };
  }

  const result = await generateObject({
    model: await getChatModel(),
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    abortSignal: signal,
    schema: extractionSchema,
    prompt: `Analyze this LLC compliance document. Return structured metadata. If it is a notice, infer risk level and a proposed task title and description.

${text.slice(0, 12000)}`,
  });

  return result.object;
}

async function updateNoticeFromExtraction(
  doc: typeof documents.$inferSelect,
  extracted: z.infer<typeof extractionSchema>,
  extractedText: string,
  database: DocumentDatabase = db
) {
  const looksLikeNotice =
    doc.category === "notice" ||
    extracted.documentType === "notice" ||
    /\bnotice\b|\bcp\d+\b|intent to levy/i.test(extractedText);

  if (!looksLikeNotice) return;

  const existing = await database.query.noticeCases.findFirst({
    where: eq(noticeCases.documentId, doc.id),
  });

  if (existing && ["confirmed", "dismissed"].includes(existing.status)) return;

  const payload = {
    documentId: doc.id,
    llcId: doc.llcId,
    userId: doc.userId,
    status: "ready",
    issuer: extracted.issuer ?? null,
    noticeType: extracted.noticeNumber ?? extracted.documentType,
    taxYear: extracted.taxYear ?? null,
    responseDueDate: extracted.dueDate ?? null,
    summary: extracted.summary ?? null,
    riskLevel: extracted.riskLevel ?? "medium",
    structuredData: extracted,
    draftTaskPayload: {
      title: extracted.proposedTaskTitle ?? `Respond to ${doc.name}`,
      description: extracted.proposedTaskDescription ?? extracted.summary,
      dueDate: extracted.dueDate,
      category: "notice",
      reminders: [
        { offsetDays: 14, channel: "email" as const },
        { offsetDays: 3, channel: "email" as const },
      ],
    },
    updatedAt: new Date(),
  };

  if (existing) {
    await database
      .update(noticeCases)
      .set(payload)
      .where(
        and(
          eq(noticeCases.id, existing.id),
          ne(noticeCases.status, "confirmed"),
          ne(noticeCases.status, "dismissed")
        )
      );
  } else {
    await database.insert(noticeCases).values(payload);
  }
}

export const documentIntelligenceServices = {
  getObjectBytes,
  classifyExtractedText,
  storeKnowledgeChunks,
  deleteKnowledgeChunksBySource,
};

export async function processDocumentIntelligence(
  documentId: string,
  readableFile?: ReadableDocument,
  requestSignal?: AbortSignal,
  services = documentIntelligenceServices,
  jobId?: string,
  leaseToken?: string
) {
  const {
    getObjectBytes,
    classifyExtractedText,
    storeKnowledgeChunks,
    deleteKnowledgeChunksBySource,
  } = services;

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (!doc) {
    throw new Error("Document not found");
  }

  if (jobId && (doc.analysisJobId !== jobId || !doc.analysisConsentAt))
    return { status: "skipped" as const };

  if (doc.wrappedFileKey && !readableFile) {
    return { status: "skipped" as const };
  }

  const attemptFence = jobId
    ? and(
        eq(documents.analysisJobId, jobId),
        sql`EXISTS (SELECT 1 FROM ${jobs} WHERE ${jobs.id} = ${jobId}
      AND ${jobs.leaseToken} = ${leaseToken ?? ""} AND ${jobs.status} = 'running'
      AND ${jobs.leaseUntil} > now())`
      )
    : undefined;

  const [claimed] = await db
    .update(documents)
    .set({
      processingStatus: "processing",
      extractedTextStatus: "processing",
      processingError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        jobId
          ? attemptFence
          : or(
              isNull(documents.processingStatus),
              ne(documents.processingStatus, "processing"),
              lt(documents.updatedAt, new Date(Date.now() - AI_TIMEOUT_MS * 2))
            )
      )
    )
    .returning({ id: documents.id });

  if (!claimed) return { status: "processing" as const };

  const timeout = AbortSignal.timeout(AI_TIMEOUT_MS);

  const signal = requestSignal
    ? AbortSignal.any([requestSignal, timeout])
    : timeout;

  try {
    const bytes = readableFile
      ? "body" in readableFile
        ? readableFile.body
        : Buffer.from(await readableFile.arrayBuffer())
      : await getObjectBytes(doc.fileKey, DOCUMENT_MAX_BYTES, signal);

    if (bytes.byteLength > DOCUMENT_MAX_BYTES) {
      throw new Error("File too large for analysis");
    }

    const extractedText = (
      await extractTextFromDocument(
        bytes,
        readableFile?.type ?? doc.fileType,
        signal
      )
    ).slice(0, DOCUMENT_MAX_TEXT_CHARS);

    const extracted = await classifyExtractedText(extractedText, signal);
    signal.throwIfAborted();
    const textPreview = extractedText.slice(0, 500);

    const chunks = {
      source: readableFile?.name ?? doc.name,
      sourceId: documentId,
      chunks: chunkText(extractedText),
      metadata: {
        kind: "user_document" as const,
        title: readableFile?.name ?? doc.name,
        documentId: doc.id,
        llcId: doc.llcId,
        state: extracted.state,
        form: extracted.formName,
      },
    };

    const save = async (database: DocumentDatabase) => {
      await deleteKnowledgeChunksBySource(documentId, database);
      await storeKnowledgeChunks(chunks, database);
      await database
        .update(documents)
        .set({
          processingStatus: "ready",
          processingError: null,
          extractedTextStatus: extractedText ? "ready" : "empty",
          documentType: extracted.documentType,
          category:
            doc.category === "other" || !doc.category
              ? extracted.documentType
              : doc.category,
          extractedMetadata: {
            ...extracted,
            textPreview,
            extractedText,
          },
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      await updateNoticeFromExtraction(doc, extracted, extractedText, database);
    };

    if (jobId) {
      await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .for("update");

        if (
          !current ||
          current.analysisJobId !== jobId ||
          !current.analysisConsentAt ||
          !current.analysisExpiresAt ||
          current.analysisExpiresAt <= new Date()
        )
          throw new Error("Analysis permission was revoked");

        const [job] = await tx
          .select()
          .from(jobs)
          .where(eq(jobs.id, jobId))
          .for("update");

        if (
          !job ||
          job.status !== "running" ||
          job.leaseToken !== leaseToken ||
          !job.leaseUntil ||
          job.leaseUntil <= new Date()
        )
          throw new Error("Job lease expired");

        await save(tx);
      });
    } else {
      await save(db);
    }

    return { status: "ready" as const };
  } catch (error) {
    await db
      .update(documents)
      .set({
        processingStatus: "failed",
        extractedTextStatus: "failed",
        processingError:
          "Analysis failed. Check the file format and AI provider, then retry.",
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), attemptFence));
    throw error;
  }
}

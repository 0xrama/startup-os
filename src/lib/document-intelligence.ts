import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { getObjectBytes } from "./r2";
import { documents, knowledgeChunks, noticeCases } from "./schema";
import {
  chunkText,
  deleteKnowledgeChunksBySource,
  storeKnowledgeChunks,
  syncKnowledgeChunksToVectorize,
} from "./knowledge";

declare global {
  var __OFFICIAL_KNOWLEDGE_SYNCED__: boolean | undefined;
}

const OFFICIAL_KNOWLEDGE_SEED = [
  {
    source: "IRS Form 5472 Guidance",
    sourceId: "irs-form-5472-guidance",
    chunks: chunkText(
      "Form 5472 generally applies to 25% foreign-owned U.S. corporations and certain foreign-owned disregarded entities. Penalties begin at $25,000 for failure to file."
    ),
    metadata: {
      kind: "irs" as const,
      title: "IRS Form 5472 Guidance",
      form: "Form 5472",
      section: "Overview",
    },
  },
  {
    source: "IRS Form 1065 Guidance",
    sourceId: "irs-form-1065-guidance",
    chunks: chunkText(
      "Domestic multi-member LLCs taxed as partnerships generally file Form 1065 by the 15th day of the third month after year end. Schedule K-1 must be provided to each partner."
    ),
    metadata: {
      kind: "irs" as const,
      title: "IRS Form 1065 Guidance",
      form: "Form 1065",
      section: "Deadline",
    },
  },
];

const extractionSchema = z.object({
  documentType: z.string().default("other"),
  summary: z.string().default(""),
  issuer: z.string().optional(),
  noticeNumber: z.string().optional(),
  dueDate: z.string().optional(),
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

async function extractTextFromDocument(
  fileKey: string,
  fileType: string | null
) {
  const bytes = await getObjectBytes(fileKey);

  if (fileType === "application/pdf") {
    const parsed = await pdfParse(bytes);
    return parsed.text.trim();
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    return parsed.value.trim();
  }

  if (fileType === "application/msword") {
    return bytes.toString("utf8").replace(/\0/g, " ").trim();
  }

  if (fileType?.startsWith("text/")) {
    return bytes.toString("utf8").trim();
  }

  if (fileType?.startsWith("image/")) {
    const mimeType = fileType;
    const base64 = bytes.toString("base64");
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
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
            { type: "image", image: `data:${mimeType};base64,${base64}` },
          ],
        },
      ],
    });
    return result.object.text.trim();
  }

  return "";
}

async function classifyExtractedText(text: string) {
  if (!text.trim()) {
    return {
      documentType: "other",
      summary: "",
    };
  }

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractionSchema,
    prompt: `Analyze this LLC compliance document. Return structured metadata. If it is a notice, infer risk level and a proposed task title and description.

${text.slice(0, 12000)}`,
  });

  return result.object;
}

export async function processDocumentIntelligence(documentId: string) {
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (!doc) {
    throw new Error("Document not found");
  }

  if (doc.wrappedFileKey) {
    await db
      .update(documents)
      .set({
        processingStatus: "skipped",
        extractedTextStatus: "skipped",
        processingError:
          "Encrypted documents require a server-readable extraction path before processing.",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    return;
  }

  await db
    .update(documents)
    .set({
      processingStatus: "processing",
      extractedTextStatus: "processing",
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  try {
    const extractedText = await extractTextFromDocument(
      doc.fileKey,
      doc.fileType
    );
    const extracted = await classifyExtractedText(extractedText);
    const textPreview = extractedText.slice(0, 500);

    await deleteKnowledgeChunksBySource(documentId);

    await storeKnowledgeChunks({
      source: doc.name,
      sourceId: documentId,
      chunks: chunkText(extractedText),
      metadata: {
        kind: "user_document",
        title: doc.name,
        documentId: doc.id,
        llcId: doc.llcId,
        state: extracted.state,
        form: extracted.formName,
      },
    });

    await db
      .update(documents)
      .set({
        processingStatus: "ready",
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

    const looksLikeNotice =
      doc.category === "notice" ||
      extracted.documentType === "notice" ||
      /notice|cp\d+|intent|department of revenue|irs/i.test(extractedText);

    if (looksLikeNotice) {
      const existing = await db.query.noticeCases.findFirst({
        where: eq(noticeCases.documentId, documentId),
      });
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
          description:
            extracted.proposedTaskDescription ??
            extracted.summary ??
            "Review the uploaded notice and respond before the deadline.",
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
        await db
          .update(noticeCases)
          .set(payload)
          .where(eq(noticeCases.id, existing.id));
      } else {
        await db.insert(noticeCases).values(payload);
      }
    }
  } catch (error) {
    await db
      .update(documents)
      .set({
        processingStatus: "failed",
        extractedTextStatus: "failed",
        processingError:
          error instanceof Error ? error.message : "Processing failed",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    throw error;
  }
}

export async function seedOfficialKnowledge() {
  if (globalThis.__OFFICIAL_KNOWLEDGE_SYNCED__) {
    return;
  }

  for (const item of OFFICIAL_KNOWLEDGE_SEED) {
    const existing = await db.query.knowledgeChunks.findFirst({
      where: eq(knowledgeChunks.sourceId, item.sourceId),
    });

    if (!existing) {
      await storeKnowledgeChunks(item);
      continue;
    }

    await syncKnowledgeChunksToVectorize(item);
  }

  globalThis.__OFFICIAL_KNOWLEDGE_SYNCED__ = true;
}

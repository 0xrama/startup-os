import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { createLogger } from "./logger";
import { documents, knowledgeChunks } from "./schema";
import {
  deleteKnowledgeVectors,
  isVectorizeEnabled,
  queryKnowledgeVectors,
  upsertKnowledgeVectors,
} from "./vectorize";

const logger = createLogger("knowledge");

export type Citation = {
  label: string;
  sourceType: "irs" | "state" | "user_document";
  sourceTitle: string;
  excerpt: string;
  page?: number;
  section?: string;
  documentId?: string;
};

export type KnowledgeChunkMetadata = {
  kind?: "irs" | "state" | "user_document";
  title?: string;
  page?: number;
  section?: string;
  taxYear?: number;
  state?: string;
  form?: string;
  documentId?: string;
  llcId?: string;
  effectiveDate?: string;
};

export type KnowledgeSearchResult = {
  id: string;
  content: string;
  source: string;
  metadata: KnowledgeChunkMetadata;
  score: number;
};

const embeddingModel = openai.embedding("text-embedding-3-small");

export function chunkText(content: string, size = 1200) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size));
  }
  return chunks;
}

export async function embedText(content: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: content,
  });
  return embedding;
}

function toChunkId(sourceId: string | undefined, index: number) {
  if (!sourceId) {
    return crypto.randomUUID();
  }

  return `${sourceId}:${index + 1}`;
}

function getKnowledgeNamespace(metadata: KnowledgeChunkMetadata) {
  return metadata.llcId ? `llc:${metadata.llcId}` : "official";
}

async function upsertKnowledgeChunksToVectorize({
  values,
}: {
  values: Array<{
    id: string;
    source: string;
    content: string;
    embedding: number[];
    metadata: KnowledgeChunkMetadata;
  }>;
}) {
  if (!isVectorizeEnabled() || values.length === 0) {
    return;
  }

  await upsertKnowledgeVectors(
    values.map((value) => ({
      id: value.id,
      values: value.embedding,
      namespace: getKnowledgeNamespace(value.metadata),
      metadata: {
        source: value.source,
        content: value.content,
        ...value.metadata,
      },
    }))
  );
}

function similarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const av = a[index];
    const bv = b[index];
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function storeKnowledgeChunks({
  source,
  sourceId,
  chunks,
  metadata,
}: {
  source: string;
  sourceId?: string;
  chunks: string[];
  metadata: KnowledgeChunkMetadata;
}) {
  if (chunks.length === 0) return;

  const values = await Promise.all(
    chunks.map(async (content, index) => {
      const chunkMetadata: KnowledgeChunkMetadata = {
        ...metadata,
        section:
          typeof metadata.section === "string"
            ? `${metadata.section} · chunk ${index + 1}`
            : `chunk ${index + 1}`,
      };

      return {
        id: toChunkId(sourceId, index),
        source,
        sourceId: sourceId ?? null,
        content,
        embedding: (await embedText(content)) as number[],
        metadata: chunkMetadata,
      };
    })
  );

  try {
    await upsertKnowledgeChunksToVectorize({
      values: values.map((value) => ({
        id: value.id,
        source: value.source,
        content: value.content,
        embedding: value.embedding ?? [],
        metadata: value.metadata,
      })),
    });
  } catch (error) {
    logger.error("Vectorize upsert failed", {
      sourceId,
      error,
    });
  }

  await db.insert(knowledgeChunks).values(values).onConflictDoNothing();
}

export async function syncKnowledgeChunksToVectorize(args: {
  source: string;
  sourceId?: string;
  chunks: string[];
  metadata: KnowledgeChunkMetadata;
}) {
  try {
    const values = await Promise.all(
      args.chunks.map(async (content, index) => {
        const metadata: KnowledgeChunkMetadata = {
          ...args.metadata,
          section:
            typeof args.metadata.section === "string"
              ? `${args.metadata.section} · chunk ${index + 1}`
              : `chunk ${index + 1}`,
        };

        return {
          id: toChunkId(args.sourceId, index),
          source: args.source,
          content,
          embedding: (await embedText(content)) as number[],
          metadata,
        };
      })
    );

    await upsertKnowledgeChunksToVectorize({ values });
  } catch (error) {
    logger.error("Vectorize sync failed", {
      sourceId: args.sourceId,
      error,
    });
  }
}

export async function deleteKnowledgeChunksBySource(sourceId: string) {
  const rows = await db
    .select({ id: knowledgeChunks.id })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId));

  try {
    await deleteKnowledgeVectors(rows.map((row) => row.id));
  } catch (error) {
    logger.error("Vectorize delete failed", {
      sourceId,
      error,
    });
  }

  await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId));
}

async function searchKnowledgeBaseInD1({
  query,
  llcId,
  limit,
}: {
  query: string;
  llcId?: string;
  limit: number;
}) {
  const embedding = await embedText(query);
  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      source: knowledgeChunks.source,
      embedding: knowledgeChunks.embedding,
      metadata: knowledgeChunks.metadata,
    })
    .from(knowledgeChunks)
    .orderBy(desc(knowledgeChunks.createdAt));

  const rowsWithScores = rows
    .map((row) => ({
      ...row,
      score: similarity(row.embedding ?? [], embedding),
    }))
    .filter((row) => {
      if (!llcId) {
        return row.metadata?.llcId == null;
      }

      const metadata = row.metadata ?? {};
      return metadata.llcId == null || metadata.llcId === llcId;
    })
    .sort((a, b) => b.score - a.score);

  return rowsWithScores.slice(0, limit).map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: (row.metadata ?? {}) as KnowledgeChunkMetadata,
    score: row.score,
  }));
}

export async function searchKnowledgeBase({
  query,
  llcId,
  limit = 5,
}: {
  query: string;
  llcId?: string;
  limit?: number;
}) {
  if (isVectorizeEnabled()) {
    try {
      const embedding = await embedText(query);
      const matches = await queryKnowledgeVectors({
        embedding,
        namespaces: llcId ? [`llc:${llcId}`, "official"] : ["official"],
        limit,
      });

      if (matches) {
        return matches.map((match) => {
          const metadata = match.metadata as KnowledgeChunkMetadata & {
            source?: string;
            content?: string;
          };

          return {
            id: match.id,
            content: metadata.content ?? "",
            source: metadata.source ?? metadata.title ?? "Knowledge base",
            metadata,
            score: match.score,
          };
        });
      }
    } catch (error) {
      logger.error("Vectorize query failed", {
        llcId,
        error,
      });
    }
  }

  return searchKnowledgeBaseInD1({
    query,
    llcId,
    limit,
  });
}

export async function getDocumentSearchResults(llcId: string, query: string) {
  const docs = await db.query.documents.findMany({
    where: eq(documents.llcId, llcId),
  });

  const q = query.toLowerCase();
  return docs.filter((doc) => {
    const metadata = doc.extractedMetadata;
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.category?.toLowerCase().includes(q) ||
      metadata?.summary?.toLowerCase().includes(q) ||
      metadata?.textPreview?.toLowerCase().includes(q) ||
      metadata?.extractedText?.toLowerCase().includes(q)
    );
  });
}

export function toCitation(item: KnowledgeSearchResult): Citation {
  const metadata = item.metadata as Record<string, unknown>;
  const sourceType =
    (metadata.kind as Citation["sourceType"] | undefined) ?? "irs";
  const sourceTitle =
    (metadata.title as string | undefined) ?? item.source ?? "Knowledge base";

  return {
    label: sourceTitle,
    sourceType,
    sourceTitle,
    excerpt: item.content.slice(0, 240),
    page: typeof metadata.page === "number" ? metadata.page : undefined,
    section:
      typeof metadata.section === "string" ? metadata.section : undefined,
    documentId:
      typeof metadata.documentId === "string" ? metadata.documentId : undefined,
  };
}

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { documents, knowledgeChunks } from "./schema";

export type Citation = {
  label: string;
  sourceType: "irs" | "state" | "user_document";
  sourceTitle: string;
  excerpt: string;
  page?: number;
  section?: string;
  documentId?: string;
  sourceUrl?: string;
  revision?: string;
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
  sourceUrl?: string;
  revision?: string;
  retrievedAt?: string;
};

export type KnowledgeSearchResult = {
  id: string;
  content: string;
  source: string;
  metadata: KnowledgeChunkMetadata;
  score: number;
};

export function chunkText(content: string, size = 1200) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("Chunk size must be a positive integer");
  }

  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) return [];

  const chunks: string[] = [];

  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size));
  }

  return chunks;
}

function toChunkId(sourceId: string | undefined, index: number) {
  if (!sourceId) {
    return crypto.randomUUID();
  }

  return `${sourceId}:${index + 1}`;
}

export function buildKnowledgeRows({
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
  return chunks.map((content, index) => {
    const chunkMetadata: KnowledgeChunkMetadata = {
      ...metadata,
      section:
        metadata.section !== undefined
          ? `${metadata.section} · chunk ${index + 1}`
          : `chunk ${index + 1}`,
    };

    return {
      id: toChunkId(sourceId, index),
      source,
      sourceId: sourceId ?? null,
      documentId: metadata.documentId ?? null,
      content,
      metadata: chunkMetadata,
    };
  });
}

export async function storeKnowledgeChunks(
  input: Parameters<typeof buildKnowledgeRows>[0],
  database: Pick<typeof db, "insert"> = db
) {
  const values = buildKnowledgeRows(input);

  // Stay below PostgreSQL parameter limits and avoid a huge query allocation.
  for (let offset = 0; offset < values.length; offset += 100) {
    await database
      .insert(knowledgeChunks)
      .values(values.slice(offset, offset + 100))
      .onConflictDoUpdate({
        target: knowledgeChunks.id,
        set: {
          source: sql`excluded.source`,
          sourceId: sql`excluded.source_id`,
          documentId: sql`excluded.document_id`,
          content: sql`excluded.content`,
          metadata: sql`excluded.metadata`,
        },
      });
  }
}

export async function deleteKnowledgeChunksBySource(
  sourceId: string,
  database: Pick<typeof db, "delete"> = db
) {
  await database
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId));
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
  const trimmed = query.trim();

  if (!trimmed) return [];

  const namespaceFilter = llcId
    ? sql`(${knowledgeChunks.metadata}->>'llcId' IS NULL OR ${knowledgeChunks.metadata}->>'llcId' = ${llcId})`
    : sql`${knowledgeChunks.metadata}->>'llcId' IS NULL`;

  const rank = sql`ts_rank(to_tsvector('english', ${knowledgeChunks.content}), websearch_to_tsquery('english', ${trimmed}))`;

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      source: knowledgeChunks.source,
      metadata: knowledgeChunks.metadata,
      score: rank,
    })
    .from(knowledgeChunks)
    .where(
      and(
        sql`to_tsvector('english', ${knowledgeChunks.content}) @@ websearch_to_tsquery('english', ${trimmed})`,
        namespaceFilter,
        sql`(${knowledgeChunks.metadata}->>'kind' IS DISTINCT FROM 'user_document'
          OR EXISTS (SELECT 1 FROM ${documents}
            WHERE ${documents.id} = ${knowledgeChunks.metadata}->>'documentId'
            AND ${documents.analysisConsentAt} IS NOT NULL
            AND ${documents.analysisExpiresAt} > now()
            AND ${documents.llcId} = ${knowledgeChunks.metadata}->>'llcId'))`
      )
    )
    .orderBy(desc(rank))
    .limit(Math.max(1, Math.min(10, Math.trunc(limit) || 5)));

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: row.metadata ?? {},
    score: Number(row.score),
  }));
}

export async function getDocumentSearchResults(
  llcId: string,
  query = "",
  category?: string
) {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

  return db
    .select({
      id: documents.id,
      name: documents.name,
      category: documents.category,
      taxYear: documents.taxYear,
      createdAt: documents.createdAt,
      summary: sql<
        string | null
      >`CASE WHEN ${documents.analysisConsentAt} IS NOT NULL
        AND ${documents.analysisExpiresAt} > now() THEN ${documents.extractedMetadata}->>'summary' ELSE NULL END`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.llcId, llcId),
        category ? eq(documents.category, category) : undefined,
        query
          ? sql`(
        ${documents.name} ILIKE ${pattern}
        OR ${documents.description} ILIKE ${pattern}
        OR ${documents.category} ILIKE ${pattern}
        OR (${documents.analysisConsentAt} IS NOT NULL AND ${documents.analysisExpiresAt} > now()
        AND (${documents.extractedMetadata}->>'summary' ILIKE ${pattern}
        OR EXISTS (SELECT 1 FROM ${knowledgeChunks}
          WHERE ${knowledgeChunks.sourceId} = ${documents.id}
          AND to_tsvector('english', ${knowledgeChunks.content}) @@ websearch_to_tsquery('english', ${query}))))
      )`
          : undefined
      )
    )
    .orderBy(desc(documents.createdAt))
    .limit(20);
}

export function toCitation(item: KnowledgeSearchResult): Citation {
  const { metadata } = item;

  const sourceTitle = metadata.title ?? item.source ?? "Knowledge base";

  return {
    label: sourceTitle,
    sourceType: metadata.kind ?? "irs",
    sourceTitle,
    excerpt: item.content.slice(0, 240),
    page: metadata.page,
    section: metadata.section,
    documentId: metadata.documentId,
    sourceUrl: metadata.sourceUrl,
    revision: metadata.revision,
  };
}

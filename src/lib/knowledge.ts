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

export function chunkText(content: string, size = 1200) {
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

  const values = chunks.map((content, index) => {
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
      content,
      metadata: chunkMetadata,
    };
  });

  await db.insert(knowledgeChunks).values(values).onConflictDoNothing();
}

export async function deleteKnowledgeChunksBySource(sourceId: string) {
  await db
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
        namespaceFilter
      )
    )
    .orderBy(desc(rank))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: row.metadata ?? {},
    score: Number(row.score),
  }));
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
  };
}

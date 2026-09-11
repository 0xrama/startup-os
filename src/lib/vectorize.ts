import type { KnowledgeChunkMetadata } from "./knowledge";

/** Flat metadata payload stored on each knowledge vector. */
export type VectorizeKnowledgeMetadata = KnowledgeChunkMetadata & {
  source: string;
  content: string;
};

type VectorizeVector = {
  id: string;
  values: number[];
  namespace?: string;
  metadata?: VectorizeKnowledgeMetadata;
};

type VectorizeQueryOptions = {
  namespace?: string;
  topK?: number;
  returnMetadata?: "none" | "indexed" | "all";
};

type VectorizeMatch = {
  id: string;
  score: number;
  metadata?: VectorizeKnowledgeMetadata;
};

type VectorizeQueryResult = {
  count: number;
  matches: VectorizeMatch[];
};

type VectorizeIndexBinding = {
  upsert: (vectors: VectorizeVector[]) => Promise<void>;
  deleteByIds: (ids: string[]) => Promise<void>;
  query: (
    vector: number[],
    options?: VectorizeQueryOptions
  ) => Promise<VectorizeQueryResult>;
};

type VectorizeRuntimeGlobals = {
  VECTORIZE?: VectorizeIndexBinding;
  env?: {
    VECTORIZE?: VectorizeIndexBinding;
  };
};

export type VectorizeKnowledgeMatch = {
  id: string;
  score: number;
  metadata: VectorizeKnowledgeMetadata;
};

function getVectorizeBinding() {
  // SAFETY: globalThis only carries the VECTORIZE binding inside the Workers
  // runtime; every access below is optional-chained so absence resolves to null.
  const globals = globalThis as VectorizeRuntimeGlobals;

  return globals.VECTORIZE ?? globals.env?.VECTORIZE ?? null;
}

export function isVectorizeEnabled() {
  return Boolean(getVectorizeBinding());
}

export async function upsertKnowledgeVectors(vectors: VectorizeVector[]) {
  const vectorize = getVectorizeBinding();

  if (!vectorize || vectors.length === 0) {
    return false;
  }

  await vectorize.upsert(vectors);

  return true;
}

export async function deleteKnowledgeVectors(ids: string[]) {
  const vectorize = getVectorizeBinding();

  if (!vectorize || ids.length === 0) {
    return false;
  }

  await vectorize.deleteByIds(ids);

  return true;
}

export async function queryKnowledgeVectors({
  embedding,
  namespaces,
  limit,
}: {
  embedding: number[];
  namespaces: string[];
  limit: number;
}) {
  const vectorize = getVectorizeBinding();

  if (!vectorize || namespaces.length === 0) {
    return null;
  }

  const settled = await Promise.allSettled(
    namespaces.map((namespace) =>
      vectorize.query(embedding, {
        namespace,
        topK: Math.min(limit, 20),
        returnMetadata: "all",
      })
    )
  );

  const fulfilled = settled.filter(
    (result): result is PromiseFulfilledResult<VectorizeQueryResult> =>
      result.status === "fulfilled"
  );

  if (fulfilled.length === 0) {
    return null;
  }

  const matches = fulfilled
    .flatMap((result) => result.value.matches)
    .filter((match): match is VectorizeKnowledgeMatch =>
      Boolean(match.metadata)
    )
    .sort((a, b) => b.score - a.score);

  return matches.slice(0, limit);
}

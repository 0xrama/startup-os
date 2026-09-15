import { OFFICIAL_TAX_GUIDANCE } from "./official-tax-guidance";
import { db } from "./db";
import { knowledgeChunks } from "./schema";
import { sql } from "drizzle-orm";
import { buildKnowledgeRows } from "./knowledge";

let seedPromise: Promise<void> | undefined;

export function seedOfficialKnowledge() {
  seedPromise ??= db
    .insert(knowledgeChunks)
    .values(
      OFFICIAL_TAX_GUIDANCE.flatMap((item) =>
        buildKnowledgeRows({
          source: item.source,
          sourceId: item.sourceId,
          chunks: [item.content],
          metadata: item.metadata,
        })
      )
    )
    .onConflictDoUpdate({
      target: knowledgeChunks.id,
      set: {
        content: sql`excluded.content`,
        metadata: sql`excluded.metadata`,
      },
      setWhere: sql`${knowledgeChunks.content} IS DISTINCT FROM excluded.content OR ${knowledgeChunks.metadata} IS DISTINCT FROM excluded.metadata`,
    })
    .then(() => undefined)
    .catch(() => {
      seedPromise = undefined;
      throw new Error("Official knowledge initialization failed");
    });

  return seedPromise;
}

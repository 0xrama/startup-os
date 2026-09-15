import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;

  const { id } = await params;

  // Verify LLC ownership
  const llc = await requireApiLlcAccess(session.user.id, id);

  if ("response" in llc) return llc.response;

  const docs = await db
    .select({
      ...getTableColumns(documents),
      extractedMetadata: sql`CASE WHEN ${documents.analysisConsentAt} IS NOT NULL AND ${documents.analysisExpiresAt} > now()
        THEN ${documents.extractedMetadata} - 'extractedText' ELSE NULL END`,
    })
    .from(documents)
    .where(eq(documents.llcId, id))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json(docs);
}

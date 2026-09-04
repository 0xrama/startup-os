import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { deleteObject } from "@/lib/r2";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import { deleteKnowledgeChunksBySource } from "@/lib/knowledge";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();
  if ("response" in context) return context.response;
  const { session } = context;

  const { id } = await params;

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const llcAccess = await requireApiLlcAccess(session.user.id, doc.llcId, {
    editable: true,
  });
  if ("response" in llcAccess) return llcAccess.response;

  await deleteObject(doc.fileKey);
  await deleteKnowledgeChunksBySource(id);
  await db.delete(documents).where(eq(documents.id, id));

  await logAudit({
    userId: session.user.id,
    action: "document.deleted",
    resourceType: "document",
    resourceId: id,
    metadata: { name: doc.name, llcId: doc.llcId },
  });

  return NextResponse.json({ success: true });
}

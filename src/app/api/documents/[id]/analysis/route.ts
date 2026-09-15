import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import { revokeDocumentAnalysis } from "@/modules/documents/lifecycle";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;

  const { id } = await params;

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await requireApiLlcAccess(context.session.user.id, doc.llcId);

  if ("response" in access) return access.response;

  await revokeDocumentAnalysis(id);

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { processDocumentIntelligence } from "@/lib/document-intelligence";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext({ feature: "document-intelligence" });
    if ("response" in context) return context.response;
    const { session } = context;

    const { id } = await params;
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const access = await requireApiLlcAccess(session.user.id, document.llcId);
    if ("response" in access) return access.response;

    await processDocumentIntelligence(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

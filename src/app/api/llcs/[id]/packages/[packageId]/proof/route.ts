import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { documents, documentPackages } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const proofSchema = z.object({
  documentId: z.string().min(1).max(100),
});

/**
 * Attaches a vault document (for example the fax confirmation or certified
 * mail receipt) as filing evidence for a package. The link is a user record
 * pointing at a document the user uploaded; Pax does not interpret it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;
  const { id, packageId } = await params;

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;

  const parsed = proofSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A document ID is required." },
      { status: 400 }
    );
  }

  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(eq(documents.id, parsed.data.documentId), eq(documents.llcId, id))
    )
    .limit(1);

  if (!document) {
    return NextResponse.json(
      { error: "That document does not belong to this entity." },
      { status: 404 }
    );
  }

  const [existing] = await db
    .select({ id: documentPackages.id })
    .from(documentPackages)
    .where(
      and(eq(documentPackages.id, packageId), eq(documentPackages.llcId, id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(documentPackages)
    .set({
      proofDocumentId: parsed.data.documentId,
      updatedAt: new Date(),
    })
    .where(eq(documentPackages.id, packageId))
    .returning({
      id: documentPackages.id,
      proofDocumentId: documentPackages.proofDocumentId,
    });

  return NextResponse.json(updated);
}

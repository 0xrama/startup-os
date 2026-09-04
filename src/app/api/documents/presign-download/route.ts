import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { getDownloadUrl } from "@/lib/r2";
import { eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function POST(request: NextRequest) {
  const context = await requireApiContext();
  if ("response" in context) return context.response;
  const { session } = context;

  const { documentId } = await request.json();

  if (!documentId) {
    return NextResponse.json(
      { error: "Missing documentId" },
      { status: 400 }
    );
  }

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const llcAccess = await requireApiLlcAccess(session.user.id, doc.llcId);
  if ("response" in llcAccess) return llcAccess.response;

  const downloadUrl = await getDownloadUrl(doc.fileKey);

  return NextResponse.json({
    downloadUrl,
    encryptedMetadata: doc.encryptedMetadata,
    wrappedFileKey: doc.wrappedFileKey,
    fileIv: doc.fileIv,
    fileName: doc.name,
    fileType: doc.fileType,
  });
}

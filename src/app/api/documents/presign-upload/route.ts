import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, userEncryption } from "@/lib/schema";
import { getUploadUrl } from "@/lib/r2";
import { randomUUID } from "crypto";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest) {
  const context = await requireApiContext({ feature: "documents" });
  if ("response" in context) return context.response;
  const { session } = context;

  const body = await request.json();
  const {
    llcId,
    fileName,
    fileType,
    fileSize,
    category,
    encryptedMetadata,
    wrappedFileKey,
    fileIv,
  } = body;

  if (!llcId || !fileName || !fileType || !fileSize) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const llcAccess = await requireApiLlcAccess(session.user.id, llcId, {
    editable: true,
  });
  if ("response" in llcAccess) return llcAccess.response;

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  if (fileSize > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 }
    );
  }

  const encryption = await db.query.userEncryption.findFirst({
    where: eq(userEncryption.userId, session.user.id),
  });
  const hasEncryption = !!encryption;

  if (hasEncryption && (!encryptedMetadata || !wrappedFileKey || !fileIv)) {
    return NextResponse.json(
      { error: "Encrypted document payload required for this account" },
      { status: 400 }
    );
  }

  const fileKey = `${session.user.id}/${llcId}/${randomUUID()}-${fileName}`;

  const [doc] = await db
    .insert(documents)
    .values({
      llcId,
      userId: session.user.id,
      name: hasEncryption ? "Encrypted document" : fileName,
      fileKey,
      fileType: hasEncryption ? null : fileType,
      fileSize: hasEncryption ? null : fileSize,
      category: hasEncryption ? "encrypted" : category || "other",
      scanStatus: "pending",
      encryptedMetadata: encryptedMetadata ?? null,
      wrappedFileKey: wrappedFileKey ?? null,
      fileIv: fileIv ?? null,
    })
    .returning();

  const uploadUrl = await getUploadUrl(
    fileKey,
    hasEncryption ? "application/octet-stream" : fileType
  );

  await logAudit({
    userId: session.user.id,
    action: "document.upload",
    resourceType: "document",
    resourceId: doc.id,
    metadata: { fileName, fileType, fileSize, category, llcId, encrypted: hasEncryption },
  });

  return NextResponse.json({
    uploadUrl,
    fileKey,
    documentId: doc.id,
  });
}

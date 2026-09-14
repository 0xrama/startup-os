import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documentPackages } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Downloads the exact bytes that were checksummed at generation time. The
 * response never regenerates content, so a package a user already filed stays
 * reproducible.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;
  const { id, packageId } = await params;

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;

  const [row] = await db
    .select()
    .from(documentPackages)
    .where(
      and(eq(documentPackages.id, packageId), eq(documentPackages.llcId, id))
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(row.content, {
    headers: {
      "content-type": `${row.contentFormat}; charset=utf-8`,
      "content-disposition": `attachment; filename="${safeFileName(row.fileName)}"`,
      "x-package-checksum": row.checksum,
      "x-package-status": row.status,
      "cache-control": "no-store",
    },
  });
}

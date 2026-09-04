import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/schema";
import { eq } from "drizzle-orm";
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
    .select()
    .from(documents)
    .where(eq(documents.llcId, id));

  return NextResponse.json(docs);
}

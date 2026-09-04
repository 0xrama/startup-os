import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noticeCases } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();
    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;

    const notice = await db.query.noticeCases.findFirst({
      where: eq(noticeCases.id, id),
    });

    if (!notice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const access = await requireApiLlcAccess(session.user.id, notice.llcId);
    if ("response" in access) return access.response;

    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load notice" },
      { status: 500 }
    );
  }
}

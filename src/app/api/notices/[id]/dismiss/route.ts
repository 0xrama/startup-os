import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { noticeCases } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function POST(
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

    const access = await requireApiLlcAccess(session.user.id, notice.llcId, {
      editable: true,
    });
    if ("response" in access) return access.response;

    const [updated] = await db
      .update(noticeCases)
      .set({
        status: "dismissed",
        updatedAt: new Date(),
      })
      .where(eq(noticeCases.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to dismiss notice" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { noticeCases } from "@/lib/schema";
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
    const access = await requireApiLlcAccess(session.user.id, id);
    if ("response" in access) return access.response;

    const notices = await db.query.noticeCases.findMany({
      where: eq(noticeCases.llcId, id),
    });

    return NextResponse.json(notices);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load notices" },
      { status: 500 }
    );
  }
}

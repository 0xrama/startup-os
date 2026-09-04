import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const context = await requireApiContext();
  if ("response" in context) return context.response;
  const { session } = context;

  const { id, taskId } = await params;
  const body = await request.json();

  // Verify LLC ownership
  const llc = await requireApiLlcAccess(session.user.id, id, { editable: true });
  if ("response" in llc) return llc.response;

  const updateData: Record<string, unknown> = {
    ...body,
    updatedAt: new Date(),
  };

  if (body.status === "completed") {
    updateData.completedAt = new Date();
  } else if (body.status && body.status !== "completed") {
    updateData.completedAt = null;
  }

  const [updated] = await db
    .update(complianceTasks)
    .set(updateData)
    .where(and(eq(complianceTasks.id, taskId), eq(complianceTasks.llcId, id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

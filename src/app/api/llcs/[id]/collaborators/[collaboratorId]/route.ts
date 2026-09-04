import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { llcCollaborators } from "@/lib/schema";
import { logAudit } from "@/lib/audit";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const context = await requireApiContext({ feature: "collaborators" });
    if ("response" in context) return context.response;
    const { session } = context;
    const { id, collaboratorId } = await params;
    const access = await requireApiLlcAccess(session.user.id, id, { manageable: true });
    if ("response" in access) return access.response;

    const { role, status } = await request.json();

    const [updated] = await db
      .update(llcCollaborators)
      .set({
        role: role ?? undefined,
        status: status ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(llcCollaborators.id, collaboratorId),
          eq(llcCollaborators.llcId, id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "collaborator.updated",
      resourceType: "llc_collaborator",
      resourceId: updated.id,
      metadata: { llcId: id, role: updated.role, status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update collaborator" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const context = await requireApiContext({ feature: "collaborators" });
    if ("response" in context) return context.response;
    const { session } = context;
    const { id, collaboratorId } = await params;
    const access = await requireApiLlcAccess(session.user.id, id, { manageable: true });
    if ("response" in access) return access.response;

    const [removed] = await db
      .delete(llcCollaborators)
      .where(
        and(
          eq(llcCollaborators.id, collaboratorId),
          eq(llcCollaborators.llcId, id)
        )
      )
      .returning();

    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "collaborator.removed",
      resourceType: "llc_collaborator",
      resourceId: removed.id,
      metadata: { llcId: id, email: removed.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove collaborator" },
      { status: 500 }
    );
  }
}

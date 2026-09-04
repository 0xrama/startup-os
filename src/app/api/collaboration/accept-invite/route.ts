import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/access";
import { db } from "@/lib/db";
import { llcCollaborators } from "@/lib/schema";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { collaboratorId } = await request.json();

    const collaborator = await db.query.llcCollaborators.findFirst({
      where: and(
        eq(llcCollaborators.id, collaboratorId),
        eq(llcCollaborators.email, session.user.email.toLowerCase())
      ),
    });

    if (!collaborator) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const [accepted] = await db
      .update(llcCollaborators)
      .set({
        userId: session.user.id,
        status: "active",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(llcCollaborators.id, collaboratorId))
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "collaborator.accepted",
      resourceType: "llc_collaborator",
      resourceId: accepted.id,
      metadata: { llcId: accepted.llcId },
    });

    return NextResponse.json(accepted);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

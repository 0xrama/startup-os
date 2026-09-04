import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { llcCollaborators } from "@/lib/schema";
import { logAudit } from "@/lib/audit";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();
    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;
    const access = await requireApiLlcAccess(session.user.id, id);
    if ("response" in access) return access.response;

    const collaborators = await db.query.llcCollaborators.findMany({
      where: eq(llcCollaborators.llcId, id),
    });
    return NextResponse.json(collaborators);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load collaborators" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext({ feature: "collaborators" });
    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;
    const access = await requireApiLlcAccess(session.user.id, id, { manageable: true });
    if ("response" in access) return access.response;

    const { email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existing = await db.query.llcCollaborators.findFirst({
      where: and(
        eq(llcCollaborators.llcId, id),
        eq(llcCollaborators.email, email.toLowerCase())
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Collaborator already exists" },
        { status: 409 }
      );
    }

    const [collaborator] = await db
      .insert(llcCollaborators)
      .values({
        llcId: id,
        email: email.toLowerCase(),
        role,
        status: "pending",
        invitedBy: session.user.id,
      })
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "collaborator.invited",
      resourceType: "llc_collaborator",
      resourceId: collaborator.id,
      metadata: { llcId: id, email, role },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to invite collaborator" },
      { status: 500 }
    );
  }
}

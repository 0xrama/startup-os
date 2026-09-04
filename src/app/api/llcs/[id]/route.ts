import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { llcs, userEncryption } from "@/lib/schema";
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

  const access = await requireApiLlcAccess(session.user.id, id);
  if ("response" in access) return access.response;

  return NextResponse.json(access.access.llc);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();
  if ("response" in context) return context.response;
  const { session } = context;

  const { id } = await params;
  const body = await request.json();
  const encryption = await db.query.userEncryption.findFirst({
    where: eq(userEncryption.userId, session.user.id),
  });
  const hasEncryption = !!encryption;

  const access = await requireApiLlcAccess(session.user.id, id, { editable: true });
  if ("response" in access) return access.response;
  const llc = access.access.llc;

  const [updated] = await db
    .update(llcs)
    .set({
      ...body,
      ein: hasEncryption ? null : body.ein,
      registeredAgent: hasEncryption ? null : body.registeredAgent,
      members: hasEncryption ? undefined : body.members,
      encryptedData: body.encryptedData ?? llc.encryptedData,
      updatedAt: new Date(),
    })
    .where(eq(llcs.id, id))
    .returning();

  return NextResponse.json(updated);
}

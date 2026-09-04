import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { buildSeedTaskMetadata } from "@/lib/compliance-task-details";
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

  const tasks = await db
    .select()
    .from(complianceTasks)
    .where(eq(complianceTasks.llcId, id));

  return NextResponse.json(tasks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();
  if ("response" in context) return context.response;
  const { session } = context;

  const { id } = await params;
  const body = await request.json();

  const llc = await requireApiLlcAccess(session.user.id, id, { editable: true });
  if ("response" in llc) return llc.response;

  const [task] = await db
    .insert(complianceTasks)
    .values({
      llcId: id,
      title: body.title,
      description: body.description,
      category: body.category,
      dueDate: body.dueDate,
      recurring: body.recurring || false,
      recurrenceRule: body.recurrenceRule,
      source: "user",
      metadata:
        body.metadata ??
        buildSeedTaskMetadata({
          title: body.title,
          description: body.description ?? null,
          status: "upcoming",
        }),
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}

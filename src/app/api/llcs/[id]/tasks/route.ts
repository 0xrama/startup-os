import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { buildSeedTaskMetadata } from "@/lib/compliance-task-details";
import { eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import { scheduleTaskReminders } from "@/lib/reminders";
import { z } from "zod";

const taskInput = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5000).optional(),
  category: z.string().max(80).optional(),
  dueDate: z.iso.date(),
  recurring: z.boolean().default(false),
  recurrenceRule: z.string().max(100).optional(),
});

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
  const parsed = taskInput.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid task details and due date are required" },
      { status: 400 }
    );
  }

  const body = parsed.data;

  const llc = await requireApiLlcAccess(session.user.id, id);

  if ("response" in llc) return llc.response;

  const task = await db.transaction(async (tx) => {
    const [created] = await tx
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
        metadata: buildSeedTaskMetadata({
          title: body.title,
          description: body.description ?? null,
          status: "upcoming",
        }),
      })
      .returning();

    await scheduleTaskReminders([created.id], session.user.id, tx);

    return created;
  });

  return NextResponse.json(task, { status: 201 });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { complianceTasks, noticeCases } from "@/lib/schema";
import { scheduleTaskReminders } from "@/lib/reminders";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext({ feature: "notice-triage" });
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

    const payload = notice.draftTaskPayload;
    if (!payload?.title || !payload.dueDate) {
      return NextResponse.json(
        { error: "Notice draft is incomplete" },
        { status: 400 }
      );
    }

    const [task] = await db
      .insert(complianceTasks)
      .values({
        llcId: notice.llcId,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        category: payload.category ?? "notice",
        source: "notice_case",
      })
      .returning();

    await scheduleTaskReminders([task.id], access.access.llc.userId);

    const [updated] = await db
      .update(noticeCases)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(noticeCases.id, id))
      .returning();

    return NextResponse.json({ notice: updated, task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm notice" },
      { status: 500 }
    );
  }
}

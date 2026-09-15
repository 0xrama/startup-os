import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { complianceTasks, noticeCases } from "@/lib/schema";
import { scheduleTaskReminders } from "@/lib/reminders";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import { noticeDraftTaskSchema } from "@/modules/compliance/notice-task";

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

    const access = await requireApiLlcAccess(session.user.id, notice.llcId);

    if ("response" in access) return access.response;

    const payload = noticeDraftTaskSchema.safeParse(notice.draftTaskPayload);

    if (!payload.success) {
      return NextResponse.json(
        { error: "Notice draft is incomplete" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(noticeCases)
        .where(eq(noticeCases.id, id))
        .for("update");

      if (!locked || locked.status !== "ready") return null;

      const payload = noticeDraftTaskSchema.safeParse(locked.draftTaskPayload);

      if (!payload.success) return null;

      const [task] = await tx
        .insert(complianceTasks)
        .values({
          llcId: notice.llcId,
          title: payload.data.title,
          description: payload.data.description,
          dueDate: payload.data.dueDate,
          category: payload.data.category ?? "notice",
          source: "notice_case",
        })
        .returning();

      await scheduleTaskReminders([task.id], access.access.llc.userId, tx);

      const [updated] = await tx
        .update(noticeCases)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(noticeCases.id, id))
        .returning();

      return { notice: updated, task };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Notice was already reviewed" },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to confirm notice",
      },
      { status: 500 }
    );
  }
}

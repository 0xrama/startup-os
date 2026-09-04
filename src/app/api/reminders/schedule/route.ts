import { NextRequest, NextResponse } from "next/server";
import { scheduleTaskReminders } from "@/lib/reminders";
import { requireApiContext } from "@/lib/route-guards";

export async function POST(request: NextRequest) {
  try {
    const context = await requireApiContext();
    if ("response" in context) return context.response;
    const { session } = context;

    const body = await request.json();
    const taskIds = body.taskIds ?? (body.taskId ? [body.taskId] : []);

    if (taskIds.length === 0) {
      return NextResponse.json(
        { error: "At least one taskId is required" },
        { status: 400 }
      );
    }

    const reminders = await scheduleTaskReminders(taskIds, session.user.id);
    return NextResponse.json({ reminders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to schedule reminders" },
      { status: 500 }
    );
  }
}

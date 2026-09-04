import { NextRequest, NextResponse } from "next/server";
import { authorizeInternalRequest } from "@/lib/internal-auth";
import { db } from "@/lib/db";
import { complianceTasks, llcs } from "@/lib/schema";
import { eq, ne } from "drizzle-orm";
import { scheduleTaskReminders } from "@/lib/reminders";
import { isTaskVisible } from "@/lib/compliance-task-details";

export async function POST(request: NextRequest) {
  if (!authorizeInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upcoming = await db.query.complianceTasks.findMany({
    where: ne(complianceTasks.status, "completed"),
  });

  const dueWindow = new Date();
  dueWindow.setUTCDate(dueWindow.getUTCDate() + 30);

  const taskIdsByUser = new Map<string, string[]>();

  for (const task of upcoming) {
    if (!isTaskVisible({ ...task, metadata: null })) continue;

    const taskDate = new Date(`${task.dueDate}T00:00:00.000Z`);
    if (taskDate > dueWindow) continue;

    const llc = await db.query.llcs.findFirst({
      where: eq(llcs.id, task.llcId),
    });
    if (!llc) continue;

    const existing = taskIdsByUser.get(llc.userId) ?? [];
    existing.push(task.id);
    taskIdsByUser.set(llc.userId, existing);
  }

  const scheduled = [];
  for (const [userId, taskIds] of taskIdsByUser.entries()) {
    scheduled.push(...(await scheduleTaskReminders(taskIds, userId)));
  }

  return NextResponse.json({ count: scheduled.length });
}

import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { complianceTasks, jobs, llcs, reminders, user } from "@/lib/schema";
import { isTaskVisible } from "@/lib/compliance-task-details";
import { enqueueJob, type JobWriter } from "@/infrastructure/jobs/queue";
import { sendReminderEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { isDeliveryUncertainError } from "./delivery-error";

type ReminderDatabase = Pick<typeof db, "select" | "insert"> & JobWriter;

const DEFAULT_REMINDER_DAYS = [30, 14, 7, 1];

export async function scheduleTaskReminders(
  taskIds: string[],
  userId: string,
  database: ReminderDatabase = db
): Promise<string[]> {
  if (database === db)
    return db.transaction((tx) => scheduleTaskReminders(taskIds, userId, tx));

  if (!taskIds.length) return [];

  const rows = await database
    .select({ task: complianceTasks, llc: llcs })
    .from(complianceTasks)
    .innerJoin(llcs, eq(complianceTasks.llcId, llcs.id))
    .where(and(inArray(complianceTasks.id, taskIds), eq(llcs.userId, userId)));

  const created: string[] = [];

  for (const { task, llc } of rows) {
    if (task.status === "completed" || !isTaskVisible(task)) continue;

    const days = llc.filingPreferences?.remindDaysBefore
      ? [llc.filingPreferences.remindDaysBefore]
      : DEFAULT_REMINDER_DAYS;

    const channels = llc.filingPreferences?.channels?.length
      ? llc.filingPreferences.channels
      : ["email"];

    for (const offsetDays of days) {
      const scheduledAt = new Date(`${task.dueDate}T09:00:00Z`);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() - offsetDays);

      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt < new Date())
        continue;

      for (const channel of channels) {
        const idempotencyKey = `${task.id}:${channel}:${scheduledAt.toISOString()}`;

        const [reminder] = await database
          .insert(reminders)
          .values({
            taskId: task.id,
            userId,
            channel,
            scheduledAt,
            idempotencyKey,
          })
          .onConflictDoNothing({ target: reminders.idempotencyKey })
          .returning({ id: reminders.id });

        if (!reminder) continue;

        await enqueueJob(
          { type: "reminder.deliver", reminderId: reminder.id },
          idempotencyKey,
          { userId, availableAt: scheduledAt },
          database
        );

        created.push(reminder.id);
      }
    }
  }

  return created;
}

// Repair pre-queue reminders and schedule newly eligible tasks. Delivery runs only in the worker.
export async function enqueueDueReminders() {
  return db.transaction(async (tx) => {
    await tx
      .update(reminders)
      .set({
        status: "delivery_unknown",
        lastError:
          "This reminder was already marked as processing without durable delivery tracking. Check the provider before retrying.",
      })
      .where(
        and(
          eq(reminders.status, "processing"),
          sql`NOT EXISTS (SELECT 1 FROM ${jobs}
        WHERE ${jobs.kind} = 'reminder.deliver'
          AND ${jobs.targetId} = ${reminders.id})`
        )
      );

    const pending = await tx
      .select({ id: complianceTasks.id, userId: llcs.userId })
      .from(complianceTasks)
      .innerJoin(llcs, eq(llcs.id, complianceTasks.llcId))
      .where(
        and(
          ne(complianceTasks.status, "completed"),
          gte(complianceTasks.dueDate, new Date().toISOString().slice(0, 10)),
          sql`NOT EXISTS (SELECT 1 FROM ${reminders}
          WHERE ${reminders.taskId} = ${complianceTasks.id})`
        )
      )
      .limit(500);

    const users = new Map<string, string[]>();
    let queued = 0;

    for (const task of pending) {
      const ids = users.get(task.userId) ?? [];
      ids.push(task.id);
      users.set(task.userId, ids);
    }

    for (const [userId, taskIds] of users) {
      queued += (await scheduleTaskReminders(taskIds, userId, tx)).length;
    }

    // Only pre-queue reminders need repair. Terminal jobs must remain parked
    // for operator review rather than starting another automatic retry cycle.
    const legacy = await tx
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.status, "pending"),
          sql`NOT EXISTS (SELECT 1 FROM ${jobs} WHERE ${jobs.kind} = 'reminder.deliver'
        AND ${jobs.targetId} = ${reminders.id})`
        )
      )
      .limit(500);

    for (const reminder of legacy) {
      const dedupeKey = reminder.idempotencyKey ?? `reminder:${reminder.id}`;

      const job = await enqueueJob(
        { type: "reminder.deliver", reminderId: reminder.id },
        dedupeKey,
        { userId: reminder.userId, availableAt: reminder.scheduledAt },
        tx
      );

      if (job) queued += 1;
    }

    return queued;
  });
}

export async function deliverReminder(reminderId: string) {
  const [row] = await db
    .select({
      reminder: reminders,
      task: complianceTasks,
      llc: llcs,
      recipient: user,
    })
    .from(reminders)
    .innerJoin(complianceTasks, eq(reminders.taskId, complianceTasks.id))
    .innerJoin(llcs, eq(complianceTasks.llcId, llcs.id))
    .innerJoin(user, eq(reminders.userId, user.id))
    .where(
      and(eq(reminders.id, reminderId), lte(reminders.scheduledAt, new Date()))
    );

  if (
    !row ||
    ["sent", "cancelled", "delivery_unknown", "failed"].includes(
      row.reminder.status ?? ""
    )
  )
    return;

  const { reminder, task, llc, recipient } = row;

  if (task.status === "completed" || !isTaskVisible(task)) {
    await db
      .update(reminders)
      .set({ status: "cancelled" })
      .where(eq(reminders.id, reminderId));

    return;
  }

  const idempotencyKey = reminder.idempotencyKey ?? `reminder:${reminder.id}`;

  if (
    reminder.status === "processing" &&
    (reminder.channel !== "email" || process.env.SMTP_URL)
  ) {
    await db
      .update(reminders)
      .set({
        status: "delivery_unknown",
        lastError:
          "Worker stopped during delivery. Check the provider before retrying.",
      })
      .where(eq(reminders.id, reminderId));

    return;
  }

  await db
    .update(reminders)
    .set({ status: "processing", processingStartedAt: new Date() })
    .where(eq(reminders.id, reminderId));

  try {
    let messageId: string | null;

    if (reminder.channel === "email") {
      const result = await sendReminderEmail({
        to: recipient.email,
        subject: `Upcoming deadline for ${llc.name}`,
        taskTitle: task.title,
        dueDate: task.dueDate,
        llcName: llc.name,
        idempotencyKey,
      });

      messageId = result.id;
    } else {
      if (!recipient.phone || !recipient.whatsappOptedIn)
        throw new Error("WhatsApp is not enabled for this account");

      const result = await sendWhatsAppMessage({
        to: recipient.phone,
        templateName: "compliance_deadline",
        parameters: [llc.name, task.title, task.dueDate],
      });

      messageId = result.messages?.[0]?.id ?? null;
    }

    await db
      .update(reminders)
      .set({
        status: "sent",
        sentAt: new Date(),
        messageId,
        attemptCount: (reminder.attemptCount ?? 0) + 1,
        lastError: null,
      })
      .where(eq(reminders.id, reminderId));
  } catch (error) {
    const uncertain = isDeliveryUncertainError(error);

    await db
      .update(reminders)
      .set({
        status: uncertain ? "delivery_unknown" : "pending",
        attemptCount: (reminder.attemptCount ?? 0) + 1,
        lastError: uncertain
          ? "Delivery may have succeeded. Check the provider before retrying."
          : "Delivery failed. Check provider configuration.",
      })
      .where(eq(reminders.id, reminderId));

    if (!uncertain) throw error;
  }
}

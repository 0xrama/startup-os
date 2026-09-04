import { and, eq, lte } from "drizzle-orm";
import { db } from "./db";
import { complianceTasks, llcs, reminders, user } from "./schema";
import { sendReminderEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { checkFeatureAccess } from "./feature-gate";
import { logAudit } from "./audit";

const DEFAULT_REMINDER_DAYS = [30, 14, 7, 1];

export async function scheduleTaskReminders(taskIds: string[], userId: string) {
  const tasks = await db.query.complianceTasks.findMany({
    where: (fields, { inArray }) => inArray(fields.id, taskIds),
  });

  const created: (typeof reminders.$inferSelect)[] = [];

  for (const task of tasks) {
    const llc = await db.query.llcs.findFirst({
      where: eq(llcs.id, task.llcId),
    });

    if (!llc || llc.userId !== userId) continue;

    const reminderDays = llc.filingPreferences?.remindDaysBefore
      ? [llc.filingPreferences.remindDaysBefore]
      : DEFAULT_REMINDER_DAYS;
    const channels = llc.filingPreferences?.channels?.length
      ? llc.filingPreferences.channels
      : ["email"];

    for (const offsetDays of reminderDays) {
      const scheduledAt = new Date(`${task.dueDate}T09:00:00.000Z`);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() - offsetDays);

      for (const channel of channels) {
        if (channel === "whatsapp") {
          const access = await checkFeatureAccess(userId, "whatsapp");
          if (!access.allowed) continue;
        }

        const idempotencyKey = `${task.id}:${channel}:${scheduledAt.toISOString()}`;
        const existing = await db.query.reminders.findFirst({
          where: eq(reminders.idempotencyKey, idempotencyKey),
        });

        if (existing) continue;

        const [reminder] = await db
          .insert(reminders)
          .values({
            taskId: task.id,
            userId,
            channel,
            scheduledAt,
            status: "pending",
            idempotencyKey,
          })
          .returning();

        created.push(reminder);
      }
    }
  }

  return created;
}

export async function processPendingReminders(batchSize = 20) {
  const due = await db.query.reminders.findMany({
    where: and(
      eq(reminders.status, "pending"),
      lte(reminders.scheduledAt, new Date())
    ),
    limit: batchSize,
  });

  for (const reminder of due) {
    const task = await db.query.complianceTasks.findFirst({
      where: eq(complianceTasks.id, reminder.taskId),
    });
    if (!task) continue;

    const llc = await db.query.llcs.findFirst({
      where: eq(llcs.id, task.llcId),
    });
    const recipient = await db.query.user.findFirst({
      where: eq(user.id, reminder.userId),
    });

    if (!llc || !recipient) continue;

    await db
      .update(reminders)
      .set({
        status: "processing",
        processingStartedAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .where(eq(reminders.id, reminder.id));

    try {
      if (reminder.channel === "email") {
        const response = await sendReminderEmail({
          to: recipient.email,
          subject: `Upcoming deadline for ${llc.name}`,
          taskTitle: task.title,
          dueDate: task.dueDate,
          llcName: llc.name,
        });

        await db
          .update(reminders)
          .set({
            status: "sent",
            sentAt: new Date(),
            messageId: response.data?.id ?? null,
            attemptCount: (reminder.attemptCount ?? 0) + 1,
            lastError: null,
          })
          .where(eq(reminders.id, reminder.id));
      } else {
        const access = await checkFeatureAccess(reminder.userId, "whatsapp");
        if (!access.allowed || !recipient.phone || !recipient.whatsappOptedIn) {
          throw new Error("WhatsApp delivery not available for this user.");
        }

        const response = await sendWhatsAppMessage({
          to: recipient.phone,
          templateName: "compliance_deadline",
          parameters: [llc.name, task.title, task.dueDate],
        });

        await db
          .update(reminders)
          .set({
            status: "sent",
            sentAt: new Date(),
            messageId: response.messages?.[0]?.id ?? null,
            attemptCount: (reminder.attemptCount ?? 0) + 1,
            lastError: null,
          })
          .where(eq(reminders.id, reminder.id));
      }

      await logAudit({
        userId: reminder.userId,
        action: "reminder.sent",
        resourceType: "reminder",
        resourceId: reminder.id,
        metadata: { channel: reminder.channel, taskId: reminder.taskId },
      });
    } catch (error) {
      const attempts = (reminder.attemptCount ?? 0) + 1;
      await db
        .update(reminders)
        .set({
          status: attempts >= 3 ? "failed" : "pending",
          attemptCount: attempts,
          lastError: error instanceof Error ? error.message : "Delivery failed",
        })
        .where(eq(reminders.id, reminder.id));

      await logAudit({
        userId: reminder.userId,
        action: "reminder.failed",
        resourceType: "reminder",
        resourceId: reminder.id,
        metadata: {
          channel: reminder.channel,
          taskId: reminder.taskId,
          error: error instanceof Error ? error.message : "Delivery failed",
        },
      });
    }
  }

  return due.length;
}

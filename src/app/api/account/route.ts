import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserSubscription, hasActiveSubscription } from "@/lib/subscription";
import {
  user,
  session,
  account,
  llcs,
  documents,
  complianceTasks,
  reminders,
  chatConversations,
  chatMessages,
  subscriptions,
  auditLogs,
  llcCollaborators,
  userEncryption,
  noticeCases,
} from "@/lib/schema";

export async function DELETE() {
  const sess = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = sess.user.id;

  const subscription = await getUserSubscription(userId);
  if (hasActiveSubscription(subscription)) {
    return NextResponse.json(
      {
        error:
          "Please cancel your subscription before deleting your account.",
      },
      { status: 400 }
    );
  }

  // Get user's LLC IDs for cascading deletes
  const userLlcs = await db
    .select({ id: llcs.id })
    .from(llcs)
    .where(eq(llcs.userId, userId));
  const llcIds = userLlcs.map((l) => l.id);

  // Get user's conversation IDs
  const userConvos = await db
    .select({ id: chatConversations.id })
    .from(chatConversations)
    .where(eq(chatConversations.userId, userId));
  const convoIds = userConvos.map((c) => c.id);

  await db.transaction(async (tx) => {
    // Delete chat messages
    if (convoIds.length > 0) {
      await tx
        .delete(chatMessages)
        .where(inArray(chatMessages.conversationId, convoIds));
    }
    await tx
      .delete(chatConversations)
      .where(eq(chatConversations.userId, userId));

    if (llcIds.length > 0) {
      // Delete notice cases
      await tx.delete(noticeCases).where(inArray(noticeCases.llcId, llcIds));

      // Delete reminders (via compliance tasks)
      const taskRows = await tx
        .select({ id: complianceTasks.id })
        .from(complianceTasks)
        .where(inArray(complianceTasks.llcId, llcIds));
      const taskIds = taskRows.map((t) => t.id);
      if (taskIds.length > 0) {
        await tx.delete(reminders).where(inArray(reminders.taskId, taskIds));
      }

      await tx
        .delete(complianceTasks)
        .where(inArray(complianceTasks.llcId, llcIds));
      await tx.delete(documents).where(inArray(documents.llcId, llcIds));
      await tx
        .delete(llcCollaborators)
        .where(inArray(llcCollaborators.llcId, llcIds));
    }

    await tx.delete(llcs).where(eq(llcs.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(auditLogs).where(eq(auditLogs.userId, userId));
    await tx.delete(userEncryption).where(eq(userEncryption.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(user).where(eq(user.id, userId));
  });

  return NextResponse.json({ success: true });
}

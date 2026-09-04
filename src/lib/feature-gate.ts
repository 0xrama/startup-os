import { count, eq, gte, or } from "drizzle-orm";
import { isAdminEmail } from "./admin";
import { db } from "./db";
import {
  chatConversations,
  chatMessages,
  documents,
  llcCollaborators,
  llcs,
  subscriptions,
  user,
} from "./schema";
import { getPlanLimits, type Plan } from "./plan-limits";

export type FeatureCode =
  | "documents"
  | "assistant"
  | "whatsapp"
  | "collaborators"
  | "notice-triage"
  | "document-intelligence"
  | "llcs";

export async function getUserPlan(userId: string): Promise<Plan> {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true },
  });

  if (isAdminEmail(currentUser?.email)) {
    return "pro";
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!sub || sub.status !== "active") return null;
  return (sub.plan as Plan) ?? null;
}

async function getDocumentCount(userId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(documents)
    .where(eq(documents.userId, userId));
  return value;
}

async function getAssistantMessageCountForUser(userId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const conversations = await db.query.chatConversations.findMany({
    where: eq(chatConversations.userId, userId),
    columns: { id: true },
  });

  if (conversations.length === 0) {
    return 0;
  }

  const ids = new Set(conversations.map((conversation) => conversation.id));
  const messages = await db.query.chatMessages.findMany({
    where: gte(chatMessages.createdAt, monthStart),
    columns: { role: true, conversationId: true },
  });

  return messages.filter(
    (message) => message.role === "user" && ids.has(message.conversationId)
  ).length;
}

async function getCollaboratorCount(userId: string) {
  const ownedLlcs = await db.query.llcs.findMany({
    where: eq(llcs.userId, userId),
    columns: { id: true },
  });

  if (ownedLlcs.length === 0) {
    return 0;
  }

  const llcIds = new Set(ownedLlcs.map((llc) => llc.id));
  const collaborators = await db.query.llcCollaborators.findMany({
    where: or(
      eq(llcCollaborators.status, "pending"),
      eq(llcCollaborators.status, "active")
    ),
    columns: { llcId: true },
  });

  return collaborators.filter((collaborator) => llcIds.has(collaborator.llcId)).length;
}

async function getLlcCount(userId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(llcs)
    .where(eq(llcs.userId, userId));
  return value;
}

export async function checkFeatureAccess(
  userId: string,
  feature: FeatureCode
): Promise<{
  allowed: boolean;
  code?: "plan_required" | "limit_reached" | "feature_locked";
  reason?: string;
  currentUsage?: number;
  limit?: number;
}> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  if (!plan) {
    return {
      allowed: false,
      code: "plan_required",
      reason: "Active subscription required.",
    };
  }

  switch (feature) {
    case "documents": {
      const currentUsage = await getDocumentCount(userId);
      if (currentUsage >= limits.maxDocuments) {
        return {
          allowed: false,
          code: "limit_reached",
          reason: "Document limit reached for your current plan.",
          currentUsage,
          limit: limits.maxDocuments,
        };
      }
      return { allowed: true, currentUsage, limit: limits.maxDocuments };
    }
    case "assistant": {
      const currentUsage = await getAssistantMessageCountForUser(userId);
      if (currentUsage >= limits.maxAssistantQueries) {
        return {
          allowed: false,
          code: "limit_reached",
          reason: "Assistant message limit reached for this billing month.",
          currentUsage,
          limit: limits.maxAssistantQueries,
        };
      }
      return { allowed: true, currentUsage, limit: limits.maxAssistantQueries };
    }
    case "whatsapp":
      if (!limits.whatsappReminders) {
        return {
          allowed: false,
          code: "feature_locked",
          reason: "WhatsApp reminders are available on the Pro plan.",
        };
      }
      return { allowed: true };
    case "collaborators": {
      if (!limits.collaborators) {
        return {
          allowed: false,
          code: "feature_locked",
          reason: "Collaborators are available on the Pro plan.",
        };
      }
      const currentUsage = await getCollaboratorCount(userId);
      return { allowed: true, currentUsage };
    }
    case "notice-triage":
      return limits.noticeTriage
        ? { allowed: true }
        : {
            allowed: false,
            code: "feature_locked",
            reason: "Notice triage is available on the Pro plan.",
          };
    case "document-intelligence":
      return limits.documentIntelligence
        ? { allowed: true }
        : {
            allowed: false,
            code: "feature_locked",
            reason: "Document intelligence is available on the Pro plan.",
          };
    case "llcs": {
      const currentUsage = await getLlcCount(userId);
      if (currentUsage >= limits.maxLlcs) {
        return {
          allowed: false,
          code: "limit_reached",
          reason: "LLC limit reached for your current plan.",
          currentUsage,
          limit: limits.maxLlcs,
        };
      }
      return { allowed: true, currentUsage, limit: limits.maxLlcs };
    }
  }
}

export function getUpgradeStatusCode(result: {
  code?: "plan_required" | "limit_reached" | "feature_locked";
}) {
  if (result.code === "plan_required") return 402;
  if (result.code === "limit_reached") return 429;
  return 403;
}

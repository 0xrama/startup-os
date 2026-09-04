import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { llcCollaborators, llcs } from "./schema";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getUserSubscription, hasActiveSubscription } from "./subscription";
import type { Plan } from "./plan-limits";
import { isAdminEmail } from "./admin";

export type LlcRole = "owner" | "editor" | "viewer";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requireSubscribedSession(): Promise<{
  session: Awaited<ReturnType<typeof requireSession>>;
  subscription: {
    status: string | null;
    plan: string | null;
  } | null;
  plan: Plan;
}> {
  const session = await requireSession();
  const subscription = await getUserSubscription(session.user.id);
  const isAdmin = isAdminEmail(session.user.email);

  if (!isAdmin && !hasActiveSubscription(subscription)) {
    throw new Error("SUBSCRIPTION_REQUIRED");
  }

  return {
    session,
    subscription: isAdmin
      ? { status: "active", plan: "pro" }
      : (subscription ?? null),
    plan: isAdmin ? "pro" : ((subscription?.plan as Plan) ?? null),
  };
}

export async function requirePageSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requirePageSubscription() {
  const session = await requirePageSession();
  const subscription = await getUserSubscription(session.user.id);
  const isAdmin = isAdminEmail(session.user.email);

  if (!isAdmin && !hasActiveSubscription(subscription)) {
    redirect("/dashboard/settings/billing");
  }

  return {
    session,
    subscription: isAdmin
      ? { status: "active", plan: "pro" }
      : subscription,
    plan: isAdmin ? "pro" : ((subscription?.plan as Plan) ?? null),
  };
}

export async function requirePageLlcAccess(llcId: string) {
  const { session, subscription, plan } = await requirePageSubscription();
  const access = await getLlcAccess(session.user.id, llcId);

  if (!access) {
    notFound();
  }

  return { session, subscription, plan, access };
}

export async function getLlcAccess(userId: string, llcId: string) {
  const llc = await db.query.llcs.findFirst({
    where: eq(llcs.id, llcId),
  });

  if (!llc) {
    return null;
  }

  if (llc.userId === userId) {
    return {
      llc,
      role: "owner" as const,
      collaborator: null,
    };
  }

  const collaborator = await db.query.llcCollaborators.findFirst({
    where: and(
      eq(llcCollaborators.llcId, llcId),
      eq(llcCollaborators.userId, userId),
      eq(llcCollaborators.status, "active")
    ),
  });

  if (!collaborator) {
    return null;
  }

  return {
    llc,
    role: collaborator.role as LlcRole,
    collaborator,
  };
}

export function canEditLlc(role: LlcRole) {
  return role === "owner" || role === "editor";
}

export function canManageCollaborators(role: LlcRole) {
  return role === "owner";
}

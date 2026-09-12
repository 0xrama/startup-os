import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { llcs } from "./schema";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
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

export async function requirePageLlcAccess(llcId: string) {
  const session = await requirePageSession();
  const access = await getLlcAccess(session.user.id, llcId);

  if (!access) {
    notFound();
  }

  return { session, access };
}

export async function getLlcAccess(userId: string, llcId: string) {
  const llc = await db.query.llcs.findFirst({
    where: eq(llcs.id, llcId),
  });

  if (!llc || llc.userId !== userId) {
    return null;
  }

  return { llc };
}

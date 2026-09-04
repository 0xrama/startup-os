import { eq } from "drizzle-orm";
import { db } from "./db";
import { user } from "./schema";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.toLowerCase());
}

export function isAdminByKnownId(userId: string | null | undefined) {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

export async function isAdminUser(userId: string, email?: string | null) {
  if (isAdminByKnownId(userId)) return true;
  if (isAdminEmail(email)) return true;

  const record = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true },
  });

  return isAdminEmail(record?.email);
}

export function isAdminUserId(userId: string) {
  return isAdminByKnownId(userId);
}

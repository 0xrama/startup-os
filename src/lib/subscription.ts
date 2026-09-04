import { eq } from "drizzle-orm";
import { db } from "./db";
import { subscriptions } from "./schema";

export async function getUserSubscription(userId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
}

export function hasActiveSubscription(
  subscription:
    | {
        status: string | null;
        plan: string | null;
      }
    | null
    | undefined
) {
  return subscription?.status === "active" && Boolean(subscription.plan);
}

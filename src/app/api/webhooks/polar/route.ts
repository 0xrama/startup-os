import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("webhook-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  const { type, data } = event;

  switch (type) {
    case "subscription.created":
    case "subscription.updated": {
      const userId = data.metadata?.userId;
      if (!userId) break;

      await db
        .insert(subscriptions)
        .values({
          userId,
          polarCustomerId: data.customer_id,
          polarSubscriptionId: data.id,
          plan: data.product?.name?.toLowerCase().includes("pro")
            ? "pro"
            : "starter",
          status: data.status === "active" ? "active" : data.status,
          currentPeriodStart: data.current_period_start
            ? new Date(data.current_period_start)
            : null,
          currentPeriodEnd: data.current_period_end
            ? new Date(data.current_period_end)
            : null,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            polarSubscriptionId: data.id,
            plan: data.product?.name?.toLowerCase().includes("pro")
              ? "pro"
              : "starter",
            status: data.status === "active" ? "active" : data.status,
            currentPeriodStart: data.current_period_start
              ? new Date(data.current_period_start)
              : null,
            currentPeriodEnd: data.current_period_end
              ? new Date(data.current_period_end)
              : null,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case "subscription.canceled": {
      const userId = data.metadata?.userId;
      if (!userId) break;

      await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));
      break;
    }
  }

  await logAudit({
    userId: data.metadata?.userId ?? null,
    action: `subscription.${type}`,
    resourceType: "subscription",
    resourceId: data.id,
    metadata: { type, status: data.status },
  });

  return NextResponse.json({ received: true });
}

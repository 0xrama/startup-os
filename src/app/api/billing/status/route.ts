import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { getUserSubscription, hasActiveSubscription } from "@/lib/subscription";
import { getPlanLimits } from "@/lib/plan-limits";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminEmail(session.user.email)) {
    return NextResponse.json({
      active: true,
      plan: "pro",
      status: "active",
      limits: getPlanLimits("pro"),
      adminBypass: true,
    });
  }

  const subscription = await getUserSubscription(session.user.id);
  const isAdmin = await isAdminUser(session.user.id, session.user.email);
  const plan = isAdmin
    ? "pro"
    : ((subscription?.plan as "starter" | "pro" | null) ?? null);

  return NextResponse.json({
    active: isAdmin || hasActiveSubscription(subscription),
    plan,
    status: isAdmin ? "active" : (subscription?.status ?? null),
    limits: getPlanLimits(plan),
    adminBypass: false,
  });
}

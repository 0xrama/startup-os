import { requirePageSession } from "@/lib/access";
import { DashboardShell } from "@/components/dashboard/shell";
import { getUserSubscription } from "@/lib/subscription";
import type { Plan } from "@/lib/plan-limits";
import { isAdminEmail } from "@/lib/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();
  const isAdmin = isAdminEmail(session.user.email);
  const subscription = await getUserSubscription(session.user.id);
  const plan = isAdmin
    ? "pro"
    : subscription?.status === "active"
      ? (subscription.plan as Plan)
      : null;

  return (
    <DashboardShell
      plan={plan}
      isAdmin={isAdmin}
      userName={session.user.name?.split(" ")[0] ?? "there"}
    >
      {children}
    </DashboardShell>
  );
}

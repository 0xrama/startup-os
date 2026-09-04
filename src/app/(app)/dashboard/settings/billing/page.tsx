import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSubscription } from "@/lib/subscription";
import { BillingPageClient } from "@/components/billing/billing-page-client";
import { isAdminEmail } from "@/lib/admin";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; success?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const isAdmin = isAdminEmail(session.user.email);
  const subscription = await getUserSubscription(session.user.id);
  const params = await searchParams;

  return (
    <BillingPageClient
      currentPlan={isAdmin ? "pro" : (subscription?.plan ?? null)}
      currentStatus={isAdmin ? "active" : (subscription?.status ?? null)}
      suggestedPlan={params.plan ?? null}
      success={params.success === "true"}
      isAdmin={isAdmin}
    />
  );
}

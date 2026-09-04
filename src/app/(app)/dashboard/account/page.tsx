import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { getUserSubscription } from "@/lib/subscription";
import { AccountPageClient } from "@/components/account/account-page-client";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isAdminUser(session.user.id, session.user.email);
  const subscription = await getUserSubscription(session.user.id);

  return (
    <AccountPageClient
      user={{
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      isAdmin={isAdmin}
      currentPlan={subscription?.plan ?? null}
      currentStatus={subscription?.status ?? null}
    />
  );
}

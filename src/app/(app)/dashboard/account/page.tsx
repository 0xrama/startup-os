import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account } from "@/lib/schema";
import { AccountPageClient } from "@/components/account/account-page-client";

export default async function AccountPage() {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/login");
  }

  const [passwordAccount, passkeys] = await Promise.all([
    db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential"),
        isNotNull(account.password)
      ),
    }),
    auth.api.listPasskeys({ headers: requestHeaders }),
  ]);

  return (
    <AccountPageClient
      user={{
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      security={{
        hasPassword: Boolean(passwordAccount),
        twoFactorEnabled: session.user.twoFactorEnabled ?? false,
        passkeys: passkeys.map((passkey) => ({
          id: passkey.id,
          name: passkey.name ?? null,
          deviceType: passkey.deviceType,
          backedUp: passkey.backedUp,
          createdAt: passkey.createdAt?.toISOString() ?? null,
        })),
      }}
    />
  );
}

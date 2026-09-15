"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function RecoveryForm() {
  const token = useSearchParams().get("token");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card-warm p-8 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);

        try {
          if (token) {
            const result = await authClient.resetPassword({
              token,
              newPassword: String(form.get("password")),
            });

            if (result.error)
              throw new Error("The reset link is invalid or expired.");

            setMessage("Password reset. Sign in again.");
          } else {
            await authClient.requestPasswordReset({
              email: String(form.get("email")),
              redirectTo: `${location.origin}/recover`,
            });
            setMessage(
              "If this account can receive recovery mail, a reset link has been sent."
            );
          }
        } catch {
          setMessage(
            "Recovery could not complete. Check the link or contact the instance operator."
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="heading-serif text-3xl">Account recovery</h1>
      <p>
        Your vault passphrase is separate. Resetting your account password
        cannot recover encrypted vault contents.
      </p>
      {token ? (
        <label>
          New password
          <Input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
      ) : (
        <label>
          Email
          <Input name="email" type="email" required autoComplete="email" />
        </label>
      )}
      <Button disabled={busy}>
        {token ? "Reset password" : "Send recovery link"}
      </Button>
      <p role="status">{message}</p>
      <Link href="/login">Back to sign in</Link>
    </form>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense>
      <RecoveryForm />
    </Suspense>
  );
}

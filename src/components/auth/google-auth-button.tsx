"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

function buildBillingUrl(plan: string | null) {
  return plan ? `/dashboard/settings/billing?plan=${plan}` : "/dashboard/settings/billing";
}

export function GoogleAuthButton({
  mode,
}: {
  mode: "signin" | "signup";
}) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const plan = searchParams.get("plan");

  if (!GOOGLE_ENABLED) {
    return null;
  }

  async function handleGoogleAuth() {
    setError("");
    setLoading(true);

    try {
      await signIn.social({
        provider: "google",
        callbackURL: buildBillingUrl(plan),
        newUserCallbackURL: buildBillingUrl(plan),
      });
    } catch {
      setError("Google sign-in is unavailable right now.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" className="h-11 w-full" onClick={handleGoogleAuth} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5A9.5 9.5 0 0 0 2.5 12 9.5 9.5 0 0 0 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12Z" />
            </svg>
            {mode === "signup" ? "Continue with Google" : "Sign in with Google"}
          </>
        )}
      </Button>
      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

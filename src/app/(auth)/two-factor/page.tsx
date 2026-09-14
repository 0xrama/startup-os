"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const normalizedCode = code.trim().replaceAll(" ", "");

    const result = useRecoveryCode
      ? await authClient.twoFactor.verifyBackupCode({
          code: normalizedCode,
          trustDevice,
        })
      : await authClient.twoFactor.verifyTotp({
          code: normalizedCode,
          trustDevice,
        });

    if (result.error) {
      setError(result.error.message || "The code was not accepted.");
      setLoading(false);

      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-8">
      <div className="mb-8">
        <div className="mb-8 lg:hidden">
          <span className="heading-serif text-xl">Pax</span>
        </div>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="heading-serif mb-2 text-3xl">Verify your sign-in</h1>
        <p className="text-sm leading-5 text-muted-foreground">
          Enter the current code from your authenticator app, or use one of your
          single-use recovery codes.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-1">
        <Button
          type="button"
          variant={useRecoveryCode ? "ghost" : "secondary"}
          size="sm"
          onClick={() => {
            setUseRecoveryCode(false);
            setCode("");
            setError("");
          }}
        >
          Authenticator
        </Button>
        <Button
          type="button"
          variant={useRecoveryCode ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setUseRecoveryCode(true);
            setCode("");
            setError("");
          }}
        >
          Recovery code
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="two-factor-code">
            {useRecoveryCode ? "Recovery code" : "Six-digit code"}
          </Label>
          <Input
            id="two-factor-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            placeholder={useRecoveryCode ? "xxxx-xxxxxx" : "123456"}
            required
            autoFocus
            className="h-11 font-mono tracking-wider"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
            className="mt-0.5 rounded accent-primary"
          />
          Trust this device for 30 days
        </label>

        <Button
          type="submit"
          className="h-11 w-full btn-warm border-0"
          disabled={!code.trim() || loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Verify
        </Button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Need to start over?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Return to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

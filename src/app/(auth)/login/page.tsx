"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2 } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

function LoginPageContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signIn.email(
      { email, password },
      {
        onError: (ctx) => {
          setError(ctx.error.message || "Invalid credentials");
          setLoading(false);
        },
        onSuccess: (ctx) => {
          if (
            ctx.data &&
            "twoFactorRedirect" in ctx.data &&
            ctx.data.twoFactorRedirect
          ) {
            return;
          }

          router.push("/dashboard");
        },
      }
    );
  }

  async function handlePasskeySignIn() {
    setError("");
    setPasskeyLoading(true);

    const result = await authClient.signIn.passkey();

    if (result.error) {
      setError(result.error.message || "Passkey sign-in failed.");
      setPasskeyLoading(false);

      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-sm sm:p-8">
      <div className="mb-8">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <span className="heading-serif text-xl">Pax</span>
        </div>
        <h1 className="heading-serif text-3xl mb-2">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Link href="/recover" className="text-sm underline">
          Forgot your password?
        </Link>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username webauthn"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password webauthn"
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 btn-warm border-0"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="bg-card px-3">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={passkeyLoading || loading}
          onClick={handlePasskeySignIn}
        >
          {passkeyLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Fingerprint className="mr-2 h-4 w-4" />
          )}
          Sign in with a passkey
        </Button>

        <GoogleAuthButton mode="signin" />

        <p className="text-sm text-muted-foreground text-center pt-2">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

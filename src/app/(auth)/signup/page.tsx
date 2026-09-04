"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const plan = searchParams.get("plan");

  function buildBillingUrl() {
    return plan ? `/dashboard/settings/billing?plan=${plan}` : "/dashboard/settings/billing";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await signUp.email(
      { name, email, password },
      {
        onError: (ctx) => {
          setError(ctx.error.message || "Something went wrong");
          setLoading(false);
        },
        onSuccess: () => {
          router.push(buildBillingUrl());
        },
      }
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-sm sm:p-8">
      <div className="mb-8">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <span className="heading-serif text-xl">Pax</span>
        </div>
        <h1 className="heading-serif text-3xl mb-2">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Create your account, secure your vault, and then choose a plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
          <Input
            id="name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-11"
          />
        </div>

        <Button type="submit" className="w-full h-11 btn-warm border-0" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
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

        <GoogleAuthButton mode="signup" />

        <p className="text-sm text-muted-foreground text-center pt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}

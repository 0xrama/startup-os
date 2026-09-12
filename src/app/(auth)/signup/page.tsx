import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SignupForm } from "@/components/auth/signup-form";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const existingUser = await db.query.user.findFirst();

  if (existingUser) {
    return (
      <div className="animate-fade-up rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-sm sm:p-8">
        <div className="mb-6">
          <div className="lg:hidden mb-8">
            <span className="heading-serif text-xl">Pax</span>
          </div>
          <h1 className="heading-serif text-3xl mb-2">
            This instance is already claimed
          </h1>
          <p className="text-sm text-muted-foreground">
            This self-hosted Pax instance holds a single account. Sign in to
            continue.
          </p>
        </div>
        <Link href="/login">
          <Button className="w-full h-11 btn-warm border-0">
            Go to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return <SignupForm />;
}

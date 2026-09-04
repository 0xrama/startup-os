"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { VaultSetupCard } from "@/components/dashboard/vault-setup-card";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$20",
    period: "/year",
    popular: false,
    features: [
      "1 LLC profile",
      "Compliance calendar & reminders",
      "Document vault (25 files)",
      "10 assistant questions/month",
      "Email reminders",
      "Onboarding course",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$35",
    period: "/year",
    popular: true,
    features: [
      "1 LLC profile",
      "Compliance calendar & reminders",
      "Document vault (unlimited)",
      "Unlimited assistant questions",
      "Email + WhatsApp reminders",
      "Onboarding course",
      "Priority support",
      "Advanced filing guidance",
    ],
  },
] as const;

export function BillingPageClient({
  currentPlan,
  currentStatus,
  suggestedPlan,
  success,
  isAdmin,
}: {
  currentPlan: string | null;
  currentStatus: string | null;
  suggestedPlan: string | null;
  success: boolean;
  isAdmin: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const active = currentStatus === "active" && Boolean(currentPlan);
  const headerCopy = useMemo(() => {
    if (isAdmin) {
      return {
        title: "Admin access enabled",
        body: "You are signed in as an admin, so billing gates are bypassed for this account.",
      };
    }

    if (active) {
      return {
        title: "Your plan is active",
        body: "Your subscription is active. Continue to company setup or manage your plan here.",
      };
    }

    if (success) {
      return {
        title: "Finish your subscription",
        body: "We are waiting for Polar to confirm your payment. If it completes, this page will reflect your active plan.",
      };
    }

    return {
      title: "Choose your plan",
      body: "Create your account, secure your vault, then pick the plan you want before adding your company details.",
    };
  }, [active, isAdmin, success]);

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) throw new Error("Failed to create checkout");

      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="heading-serif text-3xl mb-1">{headerCopy.title}</h1>
          <p className="text-sm text-muted-foreground">{headerCopy.body}</p>
        </div>
        {active ? <Badge variant="secondary">{currentPlan} active</Badge> : null}
      </div>

      <VaultSetupCard />

      {active ? (
        <div className="card-warm max-w-3xl p-8">
          <p className="text-sm text-muted-foreground mb-6">
            {isAdmin ? (
              <>
                Billing restrictions are bypassed because this user is an admin.
              </>
            ) : (
              <>
                Billing is active on the <span className="font-medium text-foreground">{currentPlan}</span> plan.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/onboarding">
              <Button className="btn-warm border-0">Continue to company setup</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">Open dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {plans.map((plan) => {
            const highlighted = suggestedPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`card-warm p-8 flex flex-col justify-between relative ${
                  plan.popular || highlighted ? "border-2 border-primary/20" : ""
                }`}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-6 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </div>
                ) : null}
                <div>
                  <h3 className="font-semibold text-lg mb-1 tracking-tight">{plan.name}</h3>
                  <div className="mt-4 mb-8">
                    <span className="heading-serif text-4xl">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${plan.popular ? "text-primary" : "text-[#2D6A4F]"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className={`w-full ${plan.popular ? "btn-warm border-0" : "btn-outline-warm"}`}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

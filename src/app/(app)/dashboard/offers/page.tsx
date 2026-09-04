import Link from "next/link";
import {
  Gift,
  ArrowUpRight,
  Cloud,
  CreditCard,
  Mail,
  Shield,
  Palette,
  Server,
  Code2,
  BarChart3,
  Sparkles,
  Rocket,
  Crown,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requirePageSubscription } from "@/lib/access";

/* ─── Offer Data ──────────────────────────────────────────────── */

type Offer = {
  name: string;
  category: string;
  description: string;
  value: string;
  icon: typeof Cloud;
  iconColor: string;
  iconBg: string;
  tier: "starter" | "pro" | "coming_soon";
  url: string;
};

const offers: Offer[] = [
  {
    name: "AWS Activate",
    category: "Cloud",
    description:
      "Up to $5,000 in AWS credits for cloud infrastructure, compute, storage, and database services for your startup.",
    value: "$5,000 credits",
    icon: Cloud,
    iconColor: "#FF9900",
    iconBg: "rgba(255, 153, 0, 0.08)",
    tier: "starter",
    url: "https://aws.amazon.com/activate/",
  },
  {
    name: "Google Cloud for Startups",
    category: "Cloud",
    description:
      "Access Google Cloud credits to build and scale your infrastructure with GCP services, BigQuery, and more.",
    value: "$2,000 credits",
    icon: Server,
    iconColor: "#4285F4",
    iconBg: "rgba(66, 133, 244, 0.08)",
    tier: "starter",
    url: "https://cloud.google.com/startup",
  },
  {
    name: "Stripe Atlas Waiver",
    category: "Payments",
    description:
      "Waived setup fees and reduced processing rates for payment infrastructure. Accept payments globally from day one.",
    value: "$500 waived",
    icon: CreditCard,
    iconColor: "#635BFF",
    iconBg: "rgba(99, 91, 255, 0.08)",
    tier: "starter",
    url: "https://stripe.com/atlas",
  },
  {
    name: "Resend Email Credits",
    category: "Email",
    description:
      "Transactional email credits for onboarding flows, receipts, and notifications. Developer-friendly API included.",
    value: "50K emails free",
    icon: Mail,
    iconColor: "#000000",
    iconBg: "rgba(0, 0, 0, 0.06)",
    tier: "starter",
    url: "https://resend.com",
  },
  {
    name: "Vercel Pro Plan",
    category: "Hosting",
    description:
      "Free Vercel Pro tier for 6 months — deploy frontend applications with edge functions, analytics, and preview deployments.",
    value: "6 months free",
    icon: Code2,
    iconColor: "#000000",
    iconBg: "rgba(0, 0, 0, 0.06)",
    tier: "starter",
    url: "https://vercel.com",
  },
  {
    name: "Figma Startup Plan",
    category: "Design",
    description:
      "Access Figma's professional design tools for free. Collaborate on UI/UX with your team and contractors.",
    value: "1 year free",
    icon: Palette,
    iconColor: "#A259FF",
    iconBg: "rgba(162, 89, 255, 0.08)",
    tier: "pro",
    url: "https://figma.com",
  },
  {
    name: "Clerk Auth Credits",
    category: "Auth",
    description:
      "User authentication and management platform. Get extended free tier for managing sign-ups, sessions, and user profiles.",
    value: "10K MAUs free",
    icon: Shield,
    iconColor: "#6C47FF",
    iconBg: "rgba(108, 71, 255, 0.08)",
    tier: "pro",
    url: "https://clerk.com",
  },
  {
    name: "Mixpanel Startup Plan",
    category: "Analytics",
    description:
      "Product analytics credits for tracking user behavior, funnels, and retention. Data-driven decisions from day one.",
    value: "$50K value",
    icon: BarChart3,
    iconColor: "#7856FF",
    iconBg: "rgba(120, 86, 255, 0.08)",
    tier: "pro",
    url: "https://mixpanel.com",
  },
  {
    name: "Notion for Startups",
    category: "Productivity",
    description:
      "Free Notion Plus plan with unlimited blocks, guests, and workspace features for your founding team.",
    value: "6 months free",
    icon: Code2,
    iconColor: "#000000",
    iconBg: "rgba(0, 0, 0, 0.06)",
    tier: "starter",
    url: "https://notion.so/startups",
  },
  {
    name: "DigitalOcean Credits",
    category: "Cloud",
    description:
      "Infrastructure credits for droplets, managed databases, and Kubernetes. Simple cloud for growing startups.",
    value: "$2,500 credits",
    icon: Cloud,
    iconColor: "#0080FF",
    iconBg: "rgba(0, 128, 255, 0.08)",
    tier: "coming_soon",
    url: "#",
  },
];

/* ─── Helpers ─────────────────────────────────────────────────── */

function tierLabel(tier: Offer["tier"]) {
  switch (tier) {
    case "starter":
      return "Included";
    case "pro":
      return "Pro plan";
    case "coming_soon":
      return "Coming soon";
  }
}

function tierBadgeStyle(tier: Offer["tier"]) {
  switch (tier) {
    case "starter":
      return "bg-[#2D6A4F]/8 text-[#2D6A4F] border-[#2D6A4F]/20";
    case "pro":
      return "bg-primary/8 text-primary border-primary/20";
    case "coming_soon":
      return "bg-muted text-muted-foreground border-border";
  }
}

/* ─── Page ────────────────────────────────────────────────────── */

export default async function OffersPage() {
  await requirePageSubscription();

  const starterOffers = offers.filter((o) => o.tier === "starter");
  const proOffers = offers.filter((o) => o.tier === "pro");
  const comingSoonOffers = offers.filter((o) => o.tier === "coming_soon");

  return (
    <div>
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-1">
          <Gift className="h-6 w-6 text-primary" />
          <h1 className="heading-serif text-3xl">Startup Offers</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl mt-1">
          Curated deals and credits included with your Pax subscription. Browse,
          redeem, and save thousands on tools you already need.
        </p>
      </div>

      {/* ─── Venture-backed Teaser ───────────────────────────── */}
      <div className="mb-10 relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] via-card to-primary/[0.06] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-base">
                Venture-backed? Something bigger is coming.
              </h3>
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 px-2 py-0.5">
                Soon
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We&apos;re building an expanded experience for venture-backed
              entities and companies raising capital — with specialized
              compliance workflows, cap table integrations, and exclusive VC
              partner deals. Stay tuned.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Included Offers ─────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="heading-serif text-xl">Included with your plan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {starterOffers.map((offer) => (
            <OfferCard key={offer.name} offer={offer} />
          ))}
        </div>
      </div>

      {/* ─── Pro Offers ──────────────────────────────────────── */}
      {proOffers.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Crown className="h-4 w-4 text-primary" />
            <h2 className="heading-serif text-xl">Pro plan perks</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proOffers.map((offer) => (
              <OfferCard key={offer.name} offer={offer} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Coming Soon ─────────────────────────────────────── */}
      {comingSoonOffers.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="heading-serif text-xl text-muted-foreground">
              Coming soon
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comingSoonOffers.map((offer) => (
              <OfferCard key={offer.name} offer={offer} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom note ─────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">How it works:</strong> Click
        &quot;Redeem offer&quot; on any deal to visit the partner&apos;s signup
        page. Some offers require you to verify your Pax subscription. All
        offers are subject to partner terms and availability.
      </div>
    </div>
  );
}

/* ─── Offer Card Component ────────────────────────────────────── */

function OfferCard({ offer }: { offer: Offer }) {
  const isComingSoon = offer.tier === "coming_soon";

  return (
    <div
      className={`card-warm p-5 flex flex-col justify-between min-h-[220px] ${
        isComingSoon ? "opacity-60" : "card-warm-lift"
      }`}
    >
      <div>
        {/* Top row: icon + badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: offer.iconBg }}
          >
            <offer.icon
              className="w-5 h-5"
              style={{ color: offer.iconColor }}
            />
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 ${tierBadgeStyle(offer.tier)}`}
          >
            {tierLabel(offer.tier)}
          </Badge>
        </div>

        {/* Name + category */}
        <h3 className="font-semibold text-sm tracking-tight mb-0.5">
          {offer.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{offer.category}</p>

        {/* Value callout */}
        <div className="inline-flex items-center gap-1.5 bg-primary/[0.06] text-primary text-xs font-medium px-2.5 py-1 rounded-md mb-3">
          <Gift className="w-3 h-3" />
          {offer.value}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {offer.description}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-5">
        {isComingSoon ? (
          <button
            disabled
            className="btn-outline-warm w-full text-xs py-2.5 opacity-50 cursor-not-allowed"
          >
            Coming soon
          </button>
        ) : (
          <Link href={offer.url} target="_blank" rel="noopener noreferrer">
            <button className="btn-outline-warm w-full text-xs py-2.5 flex items-center justify-center gap-1.5 group">
              Redeem offer
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  FolderLock,
  CalendarClock,
  BotMessageSquare,
  Bell,
  ArrowRight,
  Check,
  Zap,
  FileText,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { HeroWizard } from "@/components/marketing/hero-wizard";

/* ─── Data ─────────────────────────────────────────────────────── */

const features = [
  {
    title: "Basic Entity Coverage",
    description:
      "Track straightforward single-member LLCs, multi-member LLCs, and basic corporations for founders abroad or residents living in the U.S.",
    icon: BotMessageSquare,
    span: "md:col-span-1",
  },
  {
    title: "Document Vault",
    description:
      "Store formation documents, EIN letters, annual report receipts, and registered-agent records in one encrypted place.",
    icon: FolderLock,
    span: "md:col-span-1",
  },
  {
    title: "Compliance Calendar",
    description:
      "See the core tasks that matter right now: annual reports, franchise-tax deadlines, Form 5472 workflows, Form 1065, Form 1120, and registered-agent renewals.",
    icon: CalendarClock,
    span: "md:col-span-1",
  },
  {
    title: "Smart Reminders",
    description:
      "Automated alerts keep simple entities in good standing without pretending to replace a full tax, payroll, or venture-backoffice stack.",
    icon: Bell,
    span: "md:col-span-1",
  },
];

const steps = [
  {
    num: "01",
    title: "Connect your entity",
    description:
      "Enter the state, entity type, founder residency, EIN status, and tax classification. Pax maps the basic obligations that apply.",
    icon: Globe,
  },
  {
    num: "02",
    title: "Upload your documents",
    description:
      "Securely store Articles of Organization, Operating Agreements, and EIN letters in your encrypted vault.",
    icon: FileText,
  },
  {
    num: "03",
    title: "Automate your calendar",
    description:
      "Your compliance calendar is generated from your entity profile so the core deadlines show up early and clearly.",
    icon: CalendarClock,
  },
  {
    num: "04",
    title: "Stay on top of basics",
    description:
      "Ask Pax about annual reports, corporation returns, or founder-owner filings and get grounded answers based on IRS and state guidance.",
    icon: Zap,
  },
];

const starterFeatures = [
  "1 entity profile",
  "Compliance calendar",
  "Encrypted vault (25 docs)",
  "Email & SMS alerts",
  "10 AI queries per month",
  "Curated startup credits & deals",
];

const proFeatures = [
  "Everything in Starter",
  "Unlimited vault storage",
  "Unlimited AI queries",
  "Step-by-step filing guides",
  "WhatsApp notifications",
  "Priority support",
];

export const faqs = [
  {
    q: "Who is Pax built for?",
    a: "Pax is built for straightforward U.S. entities: basic LLCs and basic corporations run by founders abroad or by people residing in the U.S., including non-citizens living there. It is not positioned as a full operating stack for venture-backed or highly structured companies.",
  },
  {
    q: "What does Pax handle today?",
    a: "Today Pax focuses on the basics: entity setup data, annual-report tracking, registered-agent reminders, document storage, and guidance for common federal filings like Form 5472, Form 1065, and Form 1120. Managed tax execution and deeper entity operations are planned for the flagship product.",
  },
  {
    q: "Is this legal or tax advice?",
    a: "No. All guidance is strictly informational, sourced directly from IRS publications and state filing instructions. For binding legal or tax advice, always consult a licensed professional.",
  },
  {
    q: "Is this for venture-backed startups?",
    a: "No. If you are running a venture-backed company, managing a complex cap table, or need broader tax and finance operations, Pax is intentionally too lightweight today. A more complete flagship product that includes tax workflows is coming soon.",
  },
  {
    q: "How secure is the document vault?",
    a: "Your documents are stored with AES-256 encryption on Cloudflare R2 infrastructure. Access is controlled via time-limited presigned URLs — your files are never publicly accessible.",
  },
  {
    q: "What are startup offers?",
    a: "Startup Offers is our curated deal aggregator — cloud credits, SaaS discounts, and partner perks included with every Pax subscription. We negotiate deals with top tools so you can save thousands while building your company.",
  },
];

/* ─── Page ─────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-transform hover:scale-[1.02]"
          >
            <span className="heading-serif text-2xl font-bold tracking-tight text-primary">
              Pax
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Link
              href="#pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#faq"
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link href="/signup">
              <button className="bg-foreground text-background font-semibold uppercase tracking-widest text-[11px] px-6 py-2.5 rounded-full hover:bg-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,78,59,0.3)] hover:-translate-y-0.5">
                Get started
              </button>
            </Link>
          </div>

          {/* Mobile Menu Toggle (simplified for demo) */}
          <details className="group md:hidden">
            <summary className="list-none text-xs font-semibold uppercase tracking-widest cursor-pointer px-3 py-2 border border-border/50 rounded-full">
              Menu
            </summary>
            <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-6 flex flex-col gap-6 shadow-2xl">
              <Link
                href="#pricing"
                className="text-sm font-semibold uppercase tracking-widest hover:text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-semibold uppercase tracking-widest hover:text-primary transition-colors"
              >
                How it works
              </Link>
              <Link
                href="#features"
                className="text-sm font-semibold uppercase tracking-widest hover:text-primary transition-colors"
              >
                Features
              </Link>
              <Link
                href="#faq"
                className="text-sm font-semibold uppercase tracking-widest hover:text-primary transition-colors"
              >
                FAQ
              </Link>
              <hr className="border-border/50" />
              <Link
                href="/login"
                className="text-sm font-semibold uppercase tracking-widest hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link href="/signup">
                <button className="w-full bg-foreground text-background font-semibold uppercase tracking-widest text-xs px-6 py-4 rounded-full">
                  Get started
                </button>
              </Link>
            </div>
          </details>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden border-b border-border/40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-[0.03] pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-background to-background" />

        <div className="max-w-7xl mx-auto px-6 grid xl:grid-cols-12 gap-16 items-center relative z-10">
          <div className="xl:col-span-7">
            <div className="animate-fade-up inline-flex items-center gap-3 border border-border/60 bg-secondary/50 backdrop-blur-sm shadow-sm rounded-full text-[11px] font-semibold uppercase tracking-widest px-4 py-2 mb-10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Compliance for global founders
            </div>

            <h1 className="animate-fade-up stagger-1 heading-serif text-5xl sm:text-7xl lg:text-[5.5rem] tracking-tight text-balance leading-[1.05] mb-8">
              Effortless compliance for{" "}
              <span className="text-primary italic pr-2">modern</span> entities.
            </h1>

            <p className="animate-fade-up stagger-2 text-lg sm:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Pax is the enterprise-grade foundation for basic LLCs and
              corporations. Track annual reports, manage core tax deadlines, and
              securely encrypt entity documents.
            </p>

            <div className="animate-fade-up stagger-3 flex flex-wrap items-center gap-6">
              <Link href="/signup">
                <button className="bg-primary text-primary-foreground font-semibold uppercase tracking-widest text-sm px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  Initialize Workflow
                </button>
              </Link>
              <Link
                href="#how-it-works"
                className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore Platform{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="xl:col-span-5 animate-fade-in stagger-4 w-full max-w-lg justify-self-center xl:justify-self-end">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/10 to-transparent blur-2xl rounded-3xl" />
              <HeroWizard />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Marquee ───────────────────────────── */}
      <div className="py-8 bg-zinc-50 dark:bg-zinc-900 border-b border-border/40 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex items-center text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex contents">
              <span className="mx-8 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 block" />{" "}
                Fully Encrypted Vault
              </span>
              <span className="mx-8 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 block" />{" "}
                Form 5472 Guidance
              </span>
              <span className="mx-8 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 block" />{" "}
                Automated Alerts
              </span>
              <span className="mx-8 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 block" />{" "}
                Zero Vendor Lock-in
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Features Minimal Grid ────────────────────────────── */}
      <section
        id="features"
        className="py-32 bg-background border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-24">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-6 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-primary" /> Architecture
            </p>
            <h2 className="heading-serif text-5xl sm:text-6xl tracking-tight text-balance mb-8">
              Replacing scattered spreadsheets with engineered{" "}
              <span className="italic text-primary">precision</span>.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border/40 border border-border/40">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background p-12 lg:p-16 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-500 group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-32 bg-zinc-50 dark:bg-zinc-900 border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-6 flex items-center gap-2">
                <span className="w-6 h-[1px] bg-primary" /> Workflow
              </p>
              <h2 className="heading-serif text-5xl sm:text-6xl tracking-tight">
                Up and running in minutes.
              </h2>
            </div>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              Start onboarding{" "}
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-0 right-0 h-[1px] bg-border/60" />
            {steps.map((step) => (
              <div key={step.num} className="relative z-10 group">
                <div className="w-16 h-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-10 group-hover:border-primary group-hover:shadow-md transition-all duration-300">
                  <span className="text-sm font-bold text-primary">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-4 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────── */}
      <section
        id="pricing"
        className="py-32 bg-background border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-6 flex items-center justify-center gap-2">
              <span className="w-6 h-[1px] bg-primary" /> Licensing
            </p>
            <h2 className="heading-serif text-5xl sm:text-6xl tracking-tight mb-6">
              Transparent scaling.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Enterprise-grade compliance, priced for agile entities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
            {/* Starter */}
            <div className="rounded-3xl border border-border/60 bg-background p-10 lg:p-12 hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
              <h3 className="text-xl font-semibold mb-2 tracking-tight">
                Starter
              </h3>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">
                Core tracking for one straightforward straightforward entity.
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold tracking-tight">$20</span>
                <span className="text-muted-foreground text-sm font-medium">
                  / year
                </span>
              </div>
              <ul className="space-y-4 mb-10">
                {starterFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-foreground/80 font-medium"
                  >
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=starter" className="block">
                <button className="w-full bg-secondary text-foreground font-semibold text-sm px-6 py-4 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                  Select Starter
                </button>
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-3xl border border-primary bg-zinc-50 dark:bg-zinc-900 p-10 lg:p-12 shadow-2xl relative transform md:-translate-y-4">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                Recommended
              </div>
              <h3 className="text-xl font-semibold mb-2 tracking-tight text-primary">
                Pro
              </h3>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">
                Comprehensive guidance and priority support.
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold tracking-tight text-primary">
                  $35
                </span>
                <span className="text-muted-foreground text-sm font-medium">
                  / year
                </span>
              </div>
              <ul className="space-y-4 mb-10">
                {proFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-foreground/80 font-medium"
                  >
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="block">
                <button className="w-full bg-primary text-primary-foreground font-semibold text-sm px-6 py-4 rounded-full hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                  Select Pro
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────── */}
      <section className="py-32 bg-primary text-primary-foreground text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="heading-serif text-5xl sm:text-7xl mb-8 leading-[1.1] tracking-tight">
            Compliance, modernized.
          </h2>
          <p className="text-primary-foreground/80 mx-auto mb-12 text-lg sm:text-xl leading-relaxed font-light">
            Secure your documents and automate your entity deadlines in minutes.
            Join forward-thinking founders worldwide.
          </p>
          <Link href="/signup">
            <button className="bg-background text-foreground font-semibold uppercase tracking-widest px-10 py-5 rounded-full text-sm hover:scale-105 shadow-xl transition-transform duration-300">
              Initialize Your Account
            </button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="py-12 bg-background px-6 border-t border-border/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="heading-serif text-2xl font-bold text-primary">
              Pax
            </span>
            <div className="w-px h-6 bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold max-w-[200px] leading-tight">
              Informational guidance only. Not legal advice.
            </span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link
              href="/terms"
              className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/dpa"
              className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              DPA
            </Link>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              © {new Date().getFullYear()} Integrofy LLC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

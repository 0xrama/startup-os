import Link from "next/link";
import {
  FolderLock,
  CalendarClock,
  BotMessageSquare,
  Bell,
  Server,
  Database,
  KeyRound,
} from "lucide-react";

const features = [
  {
    title: "Company & entity profile",
    description:
      "Track single-member or multi-member LLCs and basic corporations, including state, EIN status, tax classification, and members.",
    icon: BotMessageSquare,
  },
  {
    title: "Encrypted document vault",
    description:
      "Store formation documents, EIN letters, and notices with client-side AES-256 encryption and time-limited presigned downloads.",
    icon: FolderLock,
  },
  {
    title: "Compliance calendar",
    description:
      "Generate the tasks that matter: annual reports, franchise taxes, Form 5472 workflows, Form 1065, Form 1120, and registered-agent renewals.",
    icon: CalendarClock,
  },
  {
    title: "Reminders",
    description:
      "Email and optional WhatsApp reminders keep deadlines visible without a spreadsheet.",
    icon: Bell,
  },
];

const selfHosting = [
  {
    title: "Your Postgres",
    description:
      "Point the app at any PostgreSQL database, including Neon or a Hyperdrive-backed connection on Cloudflare Workers.",
    icon: Database,
  },
  {
    title: "Your object storage",
    description:
      "Use any S3-compatible endpoint for the encrypted document vault: Cloudflare R2, MinIO, Wasabi, or AWS S3.",
    icon: Server,
  },
  {
    title: "Your AI endpoint",
    description:
      "Connect any OpenAI-compatible API, from OpenAI to a local Ollama server. The key stays in your own database.",
    icon: KeyRound,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="heading-serif text-2xl font-bold tracking-tight text-primary">
            Pax
          </span>
          <Link
            href="/login"
            className="rounded-full bg-foreground px-6 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-5xl px-6 py-24 lg:py-32">
          <p className="mb-6 inline-flex items-center gap-3 rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Self-hosted single-user app
          </p>
          <h1 className="heading-serif max-w-3xl text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            A compliance and tax copilot for foreign-owned US LLCs.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Pax tracks entity details, compliance deadlines, filings, and
            encrypted documents for a single owner, with an AI assistant
            grounded in IRS and state guidance. You host it, you own the data.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/login"
              className="rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Sign in
            </Link>
            <Link
              href="#self-hosting"
              className="text-sm font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Self-hosting guide
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="heading-serif text-4xl tracking-tight">
            What it does
          </h2>
          <div className="mt-14 grid gap-px border border-border/40 bg-border/40 md:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="bg-background p-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary/50">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-hosting */}
      <section id="self-hosting" className="border-b border-border/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="heading-serif text-4xl tracking-tight">
            Self-hosting
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Deploy to Vercel or Cloudflare Workers and bring your own
            infrastructure. Database, storage, email, and AI are integrations
            you configure with environment variables.
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {selfHosting.map((item) => (
              <div key={item.title}>
                <item.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-14 text-sm text-muted-foreground">
            Configure it with environment variables for Postgres, S3-compatible
            storage, and your OpenAI-compatible AI endpoint — see the setup
            guide in the repository.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-4">
            <span className="heading-serif text-2xl font-bold text-primary">
              Pax
            </span>
            <div className="h-6 w-px bg-border" />
            <span className="max-w-[220px] text-[10px] font-semibold uppercase leading-tight tracking-widest text-muted-foreground">
              Informational guidance only. Not legal or tax advice.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/terms"
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/dpa"
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              DPA
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              © {new Date().getFullYear()} Integrofy LLC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

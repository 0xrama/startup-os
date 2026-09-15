# Pax

Pax is a self-hosted, single-user compliance and tax copilot for
foreign-owned single-member US LLCs. It tracks entity details, compliance
deadlines, filings, notices, and encrypted documents, and it answers questions
with an AI assistant grounded in IRS and state guidance plus your own files.

You host it. Your data stays in your own PostgreSQL database and your own
S3-compatible object storage.

## What it does

- Company/entity profiles for LLCs and basic corporations.
- Encrypted document vault (client-side AES-256, presigned downloads).
- Compliance calendar, tasks, filings, notices, and a short course.
- Email and optional WhatsApp reminders.
- AI assistant (Form 5472 / pro forma 1120 and Form 1065 guidance) with
  Postgres full-text knowledge retrieval and citations.
- Audit log and onboarding wizard.
- Optional authenticator-app two-factor codes, recovery codes, and passkeys.

Not included: billing, plans, multi-tenant teams, or collaborator access. The
instance holds exactly one account.

**Product direction.** Pax was built inside a company that is shutting down.
The current decision is to keep it self-hosted and single-user. Whether it
ever becomes a hosted multi-customer product is undecided; that change would
require per-customer data isolation, and no such work is planned right now.

## Quick start (Docker Compose)

Compose brings up the app, PostgreSQL, MinIO (S3-compatible storage), and
Mailpit for local email.

```bash
docker compose up
```

Open `http://localhost:3000`. Signup is open until the first account exists,
then the instance is locked to that account.

### Low-resource OrbStack setup

For local testing with lower CPU and memory limits, use the small Compose
stack. It runs the app, a tuned PostgreSQL instance, and headless MinIO, with a
combined memory ceiling of about 3 GB (normal idle use is much lower).

```bash
pnpm dev:docker
```

The startup script checks Docker, starts the stack, waits for the health check,
and opens `http://localhost:3001`. Hot reload works from the host checkout.
The Node worker runs alongside the app and handles reminders, document analysis,
and cleanup.

Use `pnpm dev:docker:logs`, `pnpm dev:docker:status`, and
`pnpm dev:docker:down` to manage the stack. Run with `--no-open` to skip opening
the browser. AI, email, WhatsApp, and Google OAuth still require their provider
credentials.

## Quick start (local Node)

```bash
pnpm install
cp .env.example .env.local
# Start a Postgres (and an S3-compatible store) however you like, then:
pnpm db:migrate
pnpm dev
```

## Configuration

All configuration is environment-driven; the AI provider can also be set from
the in-app **Settings** page (stored in the database).

| Variable                                                                              | Required  | Purpose                                                                                 |
| ------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                        | Yes       | PostgreSQL connection string (use a pooled URL on serverless).                          |
| `HYPERDRIVE_CONNECTION_STRING`                                                        | Workers   | Pooled Postgres string from a Hyperdrive binding; takes precedence over `DATABASE_URL`. |
| `BETTER_AUTH_SECRET`                                                                  | Yes       | Auth signing secret.                                                                    |
| `BETTER_AUTH_URL`                                                                     | Yes       | Auth base URL.                                                                          |
| `NEXT_PUBLIC_APP_URL`                                                                 | Yes       | Public app origin.                                                                      |
| `PASSKEY_RP_ID` / `PASSKEY_ORIGIN`                                                    | No        | WebAuthn overrides; defaults are derived from the public app URL.                       |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`        | Yes       | S3-compatible storage for the vault.                                                    |
| `R2_PUBLIC_ENDPOINT`                                                                  | No        | Browser-facing storage URL when `R2_ENDPOINT` is only reachable inside Docker.          |
| `R2_FORCE_PATH_STYLE`                                                                 | MinIO     | Set `true` for path-style endpoints.                                                    |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`                                             | No        | OpenAI-compatible endpoint defaults (overridable in Settings).                          |
| `INTERNAL_CRON_SECRET`                                                                | Cron      | Signs internal reminder requests. Vercel Cron uses `CRON_SECRET`.                       |
| `DATA_ENCRYPTION_KEY`                                                                 | Jobs      | Base64 32-byte key encrypting job payloads and stored secrets.                          |
| `BACKUP_ENCRYPTION_KEY`                                                               | Backup    | Independent base64 32-byte key for encrypted database archives.                         |
| `EMAIL_FROM` / `SMTP_URL` / `RESEND_API_KEY`                                          | Reminders | Sender address plus SMTP URL or Resend key for email delivery.                          |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `NEXT_PUBLIC_WHATSAPP_ENABLED` | No        | WhatsApp reminders.                                                                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`       | No        | Google OAuth sign-in.                                                                   |

Feature flags: `FEATURE_ASSISTANT_RETRIEVAL` (default on) and
`FEATURE_REQUEST_METRICS` (default on).

### Running on a small host

Use `pnpm build` followed by `pnpm start` for regular use. Both Compose files
run a development server with file watching and on-demand compilation; their
memory limits are not production requirements.

`DATABASE_POOL_MAX` defaults to 3 connections per app process (allowed: 1–20).
Keep it at 2 or 3 on a small single-user host. Apply migrations with
`pnpm db:migrate` to enable the full-text and lookup indexes.

Chat sends at most 24 recent messages and 32,000 characters of history.
Older messages stay in the saved thread but are outside the model's context.
Each answer has a five-step tool budget, a 4,096-token output limit per step,
one retry per model call, and a three-minute timeout. Local models must support
chat completions and tool calling; image analysis also needs vision support,
and document classification needs structured JSON output.

For the lowest local memory use, run the model on a separate host or use a
hosted provider. Running model inference on the app host adds the model's own
RAM requirements.

### Document analysis and privacy

Vault uploads remain encrypted and are not analyzed automatically. Choose
**Analyze** on a document and accept the disclosure to send a decrypted copy
to your server and the configured AI provider.

Analysis runs in a background worker, not in the web request. The accepted
copy is encrypted on storage, queued, and picked up by the worker; the queued
work survives a server restart. Staging cleanup is queued on completion and
after 24 hours. Actual deletion needs a healthy worker and storage; configure
a bucket lifecycle rule for the `processing/` prefix as an independent expiry.
Extracted text, citations, and analysis are stored **unencrypted** in your
database so the assistant can
search them, and expire after 30 days unless you remove them sooner with
**Remove analysis**. The vault copy stays encrypted.

Analysis accepts files up to 25 MB and indexes up to 120,000 extracted
characters. PDF and DOCX extraction runs in a separate child process with a
128 MB V8 heap limit and a 30-second timeout. This does not cap total memory.
The production Compose worker has a separate 512 MB container limit.
PDF extraction is limited to the first 100
pages; DOCX archives must expand to at most 8 MB across at most 256 entries.
Classification uses the first 12,000 characters. Convert legacy `.doc` files
to PDF or DOCX before analysis. Image files require a vision model; scanned
PDFs without a text layer need conversion to images or external OCR.

See [the performance audit](docs/performance-audit.md) for verification details
and remaining limits.

### IRS guidance knowledge base

The app automatically seeds a compact, source-linked ruleset for Forms 5472,
1120, 1065, partnership Schedules K-2/K-3, foreign-partner withholding,
foreign-payee documentation, and Form SS-4. To load the complete current IRS
instruction PDFs into the PostgreSQL retrieval index, run this after applying
database migrations:

```bash
pnpm knowledge:sync:irs
```

The sync downloads the official IRS PDFs, replaces the matching versioned
chunks, and records each source URL, form revision, and retrieval time.

## Deployment

The same codebase builds two ways:

- **Node / Vercel / Docker** — real Next.js (`pnpm build`, `pnpm start`).
  This is the default toolchain.
- **Cloudflare Workers** — via `vinext` (`pnpm build:workers`,
  `pnpm deploy:workers`). See [cloudflare-deploy.md](cloudflare-deploy.md).

### Vercel

1. Set the environment variables above (a pooled `DATABASE_URL`).
2. Deploy with `vercel deploy` (or connect the repo; the project is detected
   as Next.js).
3. `vercel.json` registers a cron job that hits the internal reminder enqueue
   endpoint. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
   when `CRON_SECRET` is set, so set it to the same value as
   `INTERNAL_CRON_SECRET`.

### Any Node host / Docker

```bash
pnpm build && pnpm start   # serves on $PORT (default 3000)
pnpm worker                # background job worker (run alongside the app)
```

The worker is a plain Node process, so run it under systemd, a Docker service,
or any process supervisor. It claims one job at a time from PostgreSQL with a
five-minute lease renewed every 30 seconds, so a single worker per database is
enough, and a crashed worker's jobs are reclaimed after the lease expires.
Jobs retry with exponential backoff (30 seconds to one hour, three attempts)
before they are parked as failed for manual review. The worker also performs
per-minute maintenance: heartbeats, reminder scheduling, analysis expiry, and
retention cleanup.

Without the worker, queued document analysis and file cleanup still get
enqueued but wait until a worker runs. All deployments, including Vercel and
Workers frontends, need a separately hosted Node worker for reminders,
document analysis, and cleanup. Cron endpoints only enqueue work.

Health: `/api/health` for liveness. `/api/health?deep=true` (with the internal
secret header) checks the database, object storage, and a recent worker
heartbeat. It returns 503 when any dependency is unavailable. Connect it to
your own uptime monitor; Pax does not require a paid monitoring service.

Backups: back up PostgreSQL and the S3 bucket together. Keep
`DATA_ENCRYPTION_KEY` in a separate, protected recovery copy; losing it
makes queued analysis payloads and encrypted filing records unrecoverable.

`docker compose up` runs the app, worker, PostgreSQL, MinIO storage, and
Mailpit. The worker schedules and delivers reminders.

For production, see [the operations runbook](docs/operations.md).
`docker-compose.production.yml` runs separate app and memory-limited worker
containers against your configured PostgreSQL and object storage.

### Cloudflare Workers

Postgres is reached through Hyperdrive (or any reachable Postgres), storage
through S3-compatible credentials, and reminder scheduling through a Cron
Trigger on the worker's `scheduled` handler. Full guide:
[cloudflare-deploy.md](cloudflare-deploy.md).

## Commands

```bash
pnpm dev                 # Local dev server (Next.js)
pnpm build               # Production build (Next.js)
pnpm start               # Start the production server (Next.js)
pnpm dev:workers         # Local dev in the Workers runtime (vinext)
pnpm build:workers       # Production build for Workers (vinext)
pnpm deploy:workers      # Deploy to Cloudflare Workers
pnpm db:generate         # Generate Drizzle migrations
pnpm db:migrate          # Apply migrations
pnpm db:studio           # Drizzle Studio
pnpm knowledge:sync:irs  # Index the full IRS tax and international guidance set
pnpm typecheck           # tsc --noEmit
pnpm lint                # ESLint, zero warnings
pnpm run lint:oxlint     # Oxlint (includes the anti-slop rules)
pnpm test                # Vitest
pnpm test:db             # PostgreSQL regression tests against disposable pax_test
pnpm test:browser        # Chromium self-hosted workflows
pnpm knip                # Unused exports/dependencies
pnpm worker              # Background job worker
pnpm ai:evaluate         # Explicit synthetic live-provider compatibility check
pnpm backup create PATH  # Encrypted PostgreSQL backup
```

## Stack

- Next.js 16 App Router — real Next.js on Node/Vercel, `vinext` on Cloudflare
  Workers
- TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM on PostgreSQL
- Better Auth
- AI SDK with any OpenAI-compatible provider
- S3-compatible storage
- Postgres full-text search for knowledge retrieval
- Resend email, Meta WhatsApp (optional)

## Repo workflow

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for issue labels, test layout, and PR
  expectations.
- Read [docs/product-maturity.md](docs/product-maturity.md) for the current
  maturity assessment and production roadmap.
- Health endpoint: `/api/health`; metrics endpoint: `/api/metrics`.

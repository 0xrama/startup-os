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

Not included: billing, plans, multi-tenant teams, or collaborator access. The
instance holds exactly one account.

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
docker compose -f docker-compose.local.yml up -d
docker compose -f docker-compose.local.yml logs -f workspace
```

Open `http://localhost:3001`. Hot reload works from the host checkout. Enable
the reminder scheduler only when testing reminders:

```bash
docker compose -f docker-compose.local.yml --profile reminders up -d
```

Stop the stack with `docker compose -f docker-compose.local.yml down`. Add
`-v` to delete its local database, documents, dependencies, and build cache.
AI, email, WhatsApp, and Google OAuth still require their provider credentials.

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

| Variable                                                                              | Required | Purpose                                                                                 |
| ------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                        | Yes      | PostgreSQL connection string (use a pooled URL on serverless).                          |
| `HYPERDRIVE_CONNECTION_STRING`                                                        | Workers  | Pooled Postgres string from a Hyperdrive binding; takes precedence over `DATABASE_URL`. |
| `BETTER_AUTH_SECRET`                                                                  | Yes      | Auth signing secret.                                                                    |
| `BETTER_AUTH_URL`                                                                     | Yes      | Auth base URL.                                                                          |
| `NEXT_PUBLIC_APP_URL`                                                                 | Yes      | Public app origin.                                                                      |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`        | Yes      | S3-compatible storage for the vault.                                                    |
| `R2_PUBLIC_ENDPOINT`                                                                  | No       | Browser-facing storage URL when `R2_ENDPOINT` is only reachable inside Docker.          |
| `R2_FORCE_PATH_STYLE`                                                                 | MinIO    | Set `true` for path-style endpoints.                                                    |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`                                             | No       | OpenAI-compatible endpoint defaults (overridable in Settings).                          |
| `INTERNAL_CRON_SECRET`                                                                | Cron     | Signs internal reminder requests. Vercel Cron uses `CRON_SECRET`.                       |
| `RESEND_API_KEY`                                                                      | No       | Email reminders.                                                                        |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `NEXT_PUBLIC_WHATSAPP_ENABLED` | No       | WhatsApp reminders.                                                                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`       | No       | Google OAuth sign-in.                                                                   |

Feature flags: `FEATURE_ASSISTANT_RETRIEVAL` (default on) and
`FEATURE_REQUEST_METRICS` (default on).

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
3. `vercel.json` registers two cron jobs that hit the internal reminder
   endpoints. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
   when `CRON_SECRET` is set, so set it to the same value as
   `INTERNAL_CRON_SECRET`.

### Any Node host / Docker

```bash
pnpm build && pnpm start   # serves on $PORT (default 3000)
```

`docker compose up` runs the app plus PostgreSQL, MinIO storage, and a small
cron sidecar that drives the reminder endpoints.

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
pnpm typecheck           # tsc --noEmit
pnpm lint                # ESLint, zero warnings
pnpm run lint:oxlint     # Oxlint (includes the anti-slop rules)
pnpm test                # Vitest
pnpm knip                # Unused exports/dependencies
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
- Health endpoint: `/api/health`; metrics endpoint: `/api/metrics`.

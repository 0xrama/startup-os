# Startup OS

Startup OS is the operating layer for non-U.S. founders running a U.S. LLC. It pulls the boring but high-risk work into one place: filings, notices, reminders, secure document storage, collaborator access, billing, and an AI assistant that can answer from source-backed materials.

What it does well:

- Tracks LLC setup and recurring compliance work.
- Stores and processes company documents.
- Gates premium features by plan.
- Runs on Cloudflare-friendly primitives: D1, R2, Workers, Vectorize.

What it does not do yet:

- No full end-to-end browser suite yet.
- No production alerting provider is wired in yet.
- GitHub org-level settings like branch protection still need to be enabled in GitHub itself.

## Quick start

```bash
npm run setup
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run dev              # Local development server
npm run build            # Production build
npm run start            # Start the production server
npm run lint             # ESLint with zero warnings
npm run format           # Prettier check
npm run format:write     # Prettier write
npm run test             # Vitest
npm run test:ci          # Vitest with coverage
npm run knip             # Unused exports and dependency checks
npm run lint:duplicates  # Duplicate code detection via jscpd
npm run lint:todo        # Fail on TODO/FIXME markers
npm run lint:large-files # Guardrail for oversized files
npm run docs:generate    # Generate API/reference docs with TypeDoc
npm run analyze:bundle   # Bundle analysis report
npm run cf:dev           # Cloudflare-flavored local dev
npm run cf:deploy        # Deploy to Cloudflare
```

## Stack

- Next.js 16 App Router
- TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM on Cloudflare D1
- Better Auth
- OpenAI via AI SDK
- Cloudflare R2 and Vectorize
- Polar billing
- Resend email
- PostHog analytics behind consent and feature flags

## Feature flags

These are env-driven so we can ship dormant work without branching the app:

- `NEXT_PUBLIC_FEATURE_ANALYTICS`
- `NEXT_PUBLIC_FEATURE_MARKETING_EXPERIMENT`
- `FEATURE_ASSISTANT_RETRIEVAL`
- `FEATURE_REQUEST_METRICS`

## Repo workflow

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for issue labels, test layout, and PR expectations.
- Health endpoint: `/api/health`
- Metrics endpoint: `/api/metrics`

## Deployment notes

This repo is set up for Cloudflare deployment through `vinext` and `wrangler`. The deployment and release workflows live in `.github/workflows/`, but GitHub-side settings like protected branches, secret scanning, and environment approvals still need to be enabled in the repository settings UI.

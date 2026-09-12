# Cloudflare Workers Deployment

Pax runs on Cloudflare Workers through `vinext`, with PostgreSQL (via
Hyperdrive, Neon, or any reachable Postgres) and S3-compatible object storage.
There is no D1 and no Vectorize.

## 1) Prerequisites

- Install dependencies: `pnpm install`
- Authenticate with Cloudflare: `wrangler login`
- Confirm tooling: `wrangler --version`

## 2) One-time setup

1. Create a PostgreSQL database (for example Neon) and copy its connection
   string.
2. Create a Hyperdrive configuration so Workers get pooled connections:

   ```bash
   wrangler hyperdrive create pax-postgres \
     --connection-string="postgres://user:password@host/db?sslmode=require"
   ```

   Then uncomment the `[[hyperdrive]]` block in `wrangler.toml` and set the
   returned `id`. The binding exposes the pooled string as
   `HYPERDRIVE_CONNECTION_STRING`, which takes precedence over `DATABASE_URL`.
   If you skip Hyperdrive, set `DATABASE_URL` as a secret instead.

3. Update `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` in `wrangler.toml`
   `[vars]` to your deployed origin.
4. Create an S3-compatible bucket (Cloudflare R2 or any provider) for the
   document vault.

## 3) Secrets

Set these with `wrangler secret put <NAME>`:

- `BETTER_AUTH_SECRET`
- `DATABASE_URL` (only if you are not using Hyperdrive)
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `INTERNAL_CRON_SECRET`
- `AI_API_KEY` (optional; can also be set in the in-app Settings page)
- `RESEND_API_KEY` (optional, email reminders)
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` (optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional OAuth)

Set `AI_BASE_URL` and `AI_MODEL` as `[vars]` or leave them to the in-app
Settings page.

## 4) Migrations

Generate migrations locally with `pnpm db:generate` and apply them to your
hosted Postgres with `pnpm db:migrate` (or `db:push` during development).

## 5) Deployment

```bash
pnpm build:workers
pnpm dev:workers         # local Workers preview (miniflare; heavy — plain
                         # `pnpm dev` covers most day-to-day development)
pnpm deploy:workers      # production deploy
```

If deploy returns database or binding errors, confirm the Hyperdrive binding
`id` in `wrangler.toml` and that `HYPERDRIVE_CONNECTION_STRING` (or
`DATABASE_URL`) resolves at runtime.

## 6) Cron Triggers

`wrangler.toml` registers two Cron Triggers:

```toml
[triggers]
crons = ["0 * * * *", "*/15 * * * *"]
```

`main` in `wrangler.toml` points at `worker/index.ts` — a checked-in entry
that wraps the vinext router and adds the `scheduled` handler, which calls the
internal reminder endpoints (`/api/internal/reminders/enqueue-due` and
`/api/internal/reminders/process`) with the `INTERNAL_CRON_SECRET`. Both
endpoints also accept `Authorization: Bearer <secret>` and
`?secret=<secret>`. Do not point `main` back at
`vinext/server/app-router-entry`: that entry has no `scheduled` handler, and
reminders would silently stop running.

## 7) Post-deploy smoke checks

1. Open the app URL and complete the first signup; confirm the instance locks.
2. Create an LLC and confirm compliance tasks are generated.
3. Upload and download a document (S3-backed, encrypted).
4. Run document processing and an assistant query (AI endpoint configured).
5. Verify Postgres full-text knowledge search returns results.
6. Call the reminder endpoints with the secret and confirm a 200 response.

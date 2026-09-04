# Cloudflare Workers Deployment (D1 + R2 + Next.js via vinext)

This project is configured for Cloudflare Workers using vinext + Drizzle (D1) and keeps one working environment (production-like values).

## 1) Prerequisites

- Install dependencies: `npm install`
- Authenticate with Cloudflare: `wrangler login`
- Confirm tooling:
  - `wrangler --version`
  - `npx vinext --version`

## 2) One-time setup in Cloudflare

1. Create or confirm D1 database
   - `wrangler d1 create startupos` (if not created yet)
   - Copy the DB ID into `wrangler.toml`:
     - `[[d1_databases]] ... database_id = "<your-d1-id>"`
2. Replace `name`/URLs in `wrangler.toml` if needed:
   - `NEXT_PUBLIC_APP_URL`
   - `BETTER_AUTH_URL`
3. Optional: enable `[[r2_buckets]]` only after you create the bucket and switch the app to use a native Workers R2 binding.
4. Optional: create or confirm the Vectorize index:
   - `npx wrangler vectorize create pax-knowledge --dimensions=1536 --metric=cosine`
   - Uncomment the `[[vectorize]]` block in `wrangler.toml` after the index exists.
5. Check `wrangler.toml` is still valid for your resource names.
   - `main` may be managed by `vinext deploy`; keep it as-is unless you need a manual workflow.

## 3) Set all env values in Workers (secrets for sensitive values)

Use one env setup for production/staging until you add multi-env support.

### Non-secret vars (can stay in `wrangler.toml` [vars])

- `NEXT_PUBLIC_APP_URL` (app origin)
- `BETTER_AUTH_URL` (auth base URL)

### Secrets (must be set in Workers)

Run each command and paste values when prompted:

- `wrangler secret put BETTER_AUTH_SECRET`
- `wrangler secret put INTERNAL_CRON_SECRET`
- `wrangler secret put OPENAI_API_KEY`
- `wrangler secret put R2_ENDPOINT`
- `wrangler secret put R2_ACCESS_KEY_ID`
- `wrangler secret put R2_SECRET_ACCESS_KEY`
- `wrangler secret put R2_BUCKET_NAME`
- `wrangler secret put POLAR_ACCESS_TOKEN`
- `wrangler secret put POLAR_STARTER_PRODUCT_ID`
- `wrangler secret put POLAR_PRO_PRODUCT_ID`
- `wrangler secret put RESEND_API_KEY`
- `wrangler secret put WHATSAPP_PHONE_NUMBER_ID` (if using WhatsApp reminders)
- `wrangler secret put WHATSAPP_ACCESS_TOKEN` (if using WhatsApp reminders)
- Optional OAuth:
  - `wrangler secret put GOOGLE_CLIENT_ID`
  - `wrangler secret put GOOGLE_CLIENT_SECRET`

> Tip: `R2_*` values are required by current `src/lib/r2.ts` S3-style implementation.
> Tip: Vectorize has no local simulator. The `[[vectorize]]` binding in `wrangler.toml` uses `remote = true`, so local Workers dev talks to the real Cloudflare index.

## 4) D1 migration (must run once/after schema changes)

- `npm run cf:d1:migrate:prod`
- For local D1 SQL testing:
  - `npm run cf:d1:migrate:local`

> Note: the initial migration already includes Better Auth's core tables:
> `user`, `session`, `account`, and `verification`.

## 5) Deployment

- Compatibility pass (first time or after major changes):
  - `npx vinext check`
- Local Workers preview:
  - `npm run cf:dev`
- Production deploy:
  - `npm run cf:deploy`
- Optional alias:
  - `npm run deploy` (same as `vinext deploy`)
- If deploy returns DB/binding errors:
  - Check `wrangler.toml` `database_id`
  - Confirm `binding = "DB"` in `[[d1_databases]]`
  - Confirm R2 bucket names/credentials and `R2_BUCKET_NAME`

## 6) Post-deploy smoke checks

1. Open app URL from deploy output
2. Test auth login/signup flow
3. Upload/download document (R2-backed endpoints)
4. Verify DB writes: create an LLC record + document row
5. Test reminders endpoint and auth-protected routes

## 7) Useful one-shot command list

- `npx vinext check`
- `npm run cf:dev`
- `npm run cf:build`
- `npm run cf:deploy`
- `npm run cf:d1:migrate:prod`

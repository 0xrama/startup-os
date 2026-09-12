# Operations Runbook

## Health check

- Call `/api/health`
- Expect `200`, `status: "ok"`, and an `x-request-id` header

## Metrics scrape

- Call `/api/metrics`
- If `INTERNAL_CRON_SECRET` is set, include `x-internal-secret`

## Reminder scheduling

- `GET`/`POST /api/internal/reminders/enqueue-due` builds the reminder queue.
- `GET`/`POST /api/internal/reminders/process` delivers due reminders.
- Authenticate with `x-internal-secret`, `Authorization: Bearer <secret>`, or
  `?secret=<secret>`.
- Vercel Cron calls these via `vercel.json`; Cloudflare calls them from the
  worker's `scheduled` handler.

## Debugging

- Correlate API failures by `x-request-id`
- Structured logs redact tokens, passwords, cookies, key material, and ciphertext
- Assistant and health endpoints increment in-memory counters for quick smoke checks

## Common failures

- `Database connection string missing`
  - `DATABASE_URL` (or `HYPERDRIVE_CONNECTION_STRING` on Workers) is not set
- `Unauthorized` from `/api/metrics` or the reminder endpoints
  - The internal secret is missing or wrong
- `AI provider not configured — set it in Settings`
  - No OpenAI-compatible endpoint/key is set in the database or environment
- Empty assistant citations
  - `FEATURE_ASSISTANT_RETRIEVAL` is off or the knowledge base has no matching
    chunks

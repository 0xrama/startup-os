# Operations Runbook

## Health check

- Call `/api/health`
- Expect `200`, `status: "ok"`, and an `x-request-id` header

## Metrics scrape

- Call `/api/metrics`
- If `INTERNAL_CRON_SECRET` is set, include `x-internal-secret`

## Debugging

- Correlate API failures by `x-request-id`
- Structured logs redact tokens, passwords, cookies, key material, and ciphertext
- Assistant and health endpoints increment in-memory counters for quick smoke checks

## Common failures

- `D1 database binding missing`
  - The runtime did not receive `DB`/`__D1_DB__`
- `Unauthorized` from `/api/metrics`
  - The scrape secret header is missing or wrong
- empty assistant citations
  - `FEATURE_ASSISTANT_RETRIEVAL` is off or Vectorize/embedding setup is unavailable

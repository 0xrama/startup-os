# Operations runbook

The maintained self-hosting runbook is
[docs/operations.md](../operations.md). It covers the Node worker, deep health
checks, parked jobs, safe retries, document expiry, encrypted backups, and
restore drills.

The internal reminder routes only enqueue work. They do not deliver messages.
Keep a Node worker running for reminder delivery, document analysis, object
cleanup, and retention.

Use `/api/health` for liveness. Call `/api/health?deep=true` with the internal
secret to check PostgreSQL, object storage, and worker recency. `/api/metrics`
contains process metrics and uses the same secret when configured.

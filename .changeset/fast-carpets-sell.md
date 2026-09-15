---
"pax": minor
---

Production hardening: durable PostgreSQL job queue with a Node worker
(document analysis, reminder delivery, object cleanup) with leases, retries,
and retention; opt-in document analysis moved out of the web request with a
consent record, 30-day expiry, and revocation; server-side encryption for job
payloads, filing snapshots, transaction facts, and the stored AI API key;
versioned compliance deadlines with federal holiday rolling; encrypted
related-party transaction records with user review snapshots; transactional
account deletion that queues file cleanup; deep readiness health check;
operational records for assistant usage; SMTP email delivery with idempotent
message IDs; password-reset email support; encrypted backup and scratch-restore
commands; owner-facing failure recovery; browser and PostgreSQL workflow tests;
and production app/worker container definitions. Requires
`DATA_ENCRYPTION_KEY` and migrations through 0011.

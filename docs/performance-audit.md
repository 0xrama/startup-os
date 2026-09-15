# Performance and AI audit

Date: 2026-09-14

## Scope

Reviewed AI configuration and tools, chat persistence and streaming, document
extraction and encryption, retrieval queries and indexes, dashboard reads,
browser fetches, reminder scheduling, and local runtime configuration. Ran
repository-wide static checks and reviewed the changes for reuse, correctness,
and resource use.

This is a source audit with regression tests, not a production load test or a
complete security assessment.

## Changes

| Area                | Finding                                                                                  | Change                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AI provider         | Default provider call used the Responses API, which many compatible servers lack         | Use chat completions; test with the real SDK and a local response fixture                                                         |
| Tool execution      | A tool call ended the turn without a follow-up answer                                    | Allow five steps, force the last step to answer without tools                                                                     |
| Model context       | Every turn loaded all messages and sent both tax manuals                                 | Load at most 24 messages / 32,000 history characters; select relevant manuals                                                     |
| Streaming           | No cancellation or output/time limits; provider errors could look like empty success     | Pass cancellation, cap output at 4,096 tokens per step, one retry per call, three-minute model timeout, propagate stream failures |
| Chat UI             | Changing conversation state refetched threads and could reopen the previous thread       | Explicit initial selection, cancellation and navigation guards                                                                    |
| Chat history        | Every completed response reloaded the entire thread                                      | Cursor-paginated history, 100 messages per page, refresh only the saved turn                                                      |
| Rendering           | Every token updated the full message tree                                                | Batch updates to animation frames and memoize unchanged message bubbles                                                           |
| Tool queries        | Document body matches were discarded by a second name filter; tasks were unlimited       | Search bodies through indexed chunks; project results; paginate tasks with date filters and continuation cursors                  |
| Retrieval startup   | Chat imported PDF/DOCX parsers and seeded each source separately                         | Separate lazy parser loading from a batched, single-flight seed; skip unchanged seed writes                                       |
| Database            | Full-text search and frequent lookups lacked indexes                                     | Add migrations `0005` and `0006`; default pool size falls from 10 to 3 per process                                                |
| Dashboard and vault | Loaded full documents just to count them or show names                                   | Count in SQL, select needed fields, omit extracted bodies from vault list responses                                               |
| Document analysis   | Encrypted uploads were marked successful despite being skipped                           | Explicit Analyze action and server-enforced consent for sending readable content                                                  |
| Document resources  | Download and extraction output had no effective upper bounds                             | Bound file reads, indexed text, classification input, PDF pages, and actual DOCX expansion                                        |
| Document lifecycle  | Concurrent analysis duplicated work; deletion could leave searchable text                | Claim processing atomically, allow stale claims to retry, cascade document-linked chunks, hide legacy orphans                     |
| Notices             | Any text mentioning IRS could create a notice; re-analysis could reopen reviewed notices | Narrow detection and protect confirmed/dismissed states in the update predicate                                                   |

Uploads remain encrypted by default. Opt-in analysis sends a readable copy to
the configured provider and stores extracted text and analysis unencrypted.
This trade-off is disclosed before analysis. Existing chat content and citations
remain stored; deleting a document does not erase quotations already saved in
a chat.

## Verification results

- 98 tests pass, up from the 59-test baseline.
- TypeScript, ESLint, Oxlint, formatting, dependency checks, duplicate checks,
  comment checks, large-file checks, and `git diff --check` pass.
- Next.js and Workers production builds both pass. The Next.js build used an
  explicit build-only auth placeholder; deployment still needs a real secret.
- The Workers build reports dependency annotation warnings and one client
  chunk over 500 KB. The largest generated client chunk is 518,371 bytes
  (162,475 bytes gzipped). This is a build measurement, not a before/after
  performance comparison; Workers client chunk splitting remains worth
  profiling.

## Verification limits and remaining work

The following limits describe the original 2026-09-14 audit. The follow-up
section records which items changed.

- No live PostgreSQL migration, query-plan measurement, authenticated browser
  run, or real-provider test was performed. Docker was unavailable and no
  provider was configured for this audit. Tests substitute external services
  through service interfaces and database methods.
- PDF/DOCX parsers still run in the app process. Page/expansion limits reduce
  ordinary resource use but do not provide hard CPU isolation for pathological
  PDFs. Use a resource-limited extraction worker before accepting untrusted
  third-party uploads at scale.
- Document and conversation lists can still grow. Chat messages and task-tool
  results are paginated, but the vault list and thread sidebar need pagination
  for large archives. Loading earlier chat pages intentionally retains them in
  the browser.
- Multiple app processes multiply the configured database pool size. AI
  request limits are per request, not a distributed concurrency quota.
- The reminder scheduler still has per-task/per-reminder queries and
  read-before-write delivery claims. Concurrent scheduler runs can duplicate
  sends; a transactional claim and idempotent scheduling pass remain needed.
- Scanned PDFs need OCR. Image analysis requires a vision-capable model.
  Legacy `.doc` analysis is rejected instead of treating binary bytes as text.
- Existing duplicated notice-route guards, profile decryption, and legal-page
  markup remain. The duplicate check reports them below its failure threshold;
  they are not established runtime bottlenecks.

## Deployment

Back up the database, apply `pnpm db:migrate`, then restart the app. Both new
migrations are required before using the new document-analysis path.
No migration was applied to an existing database during this audit.

For regular use on a small host, build once and run `pnpm start`, rather than
the development Compose servers. Keep `DATABASE_POOL_MAX` at 2 or 3 and run
model inference elsewhere if local RAM is constrained. No minimum RAM figure
or percentage speedup is claimed without a representative workload.

## Follow-up: production hardening (2026-09-15)

Document analysis now runs in a PostgreSQL-backed Node worker instead of the
web request. PDF and DOCX extraction runs in a child process with a 128 MB V8
heap limit and a 30-second timeout. This limits the parser heap but does not
cap total memory. The production Compose worker has a separate 512 MB container
limit that still needs verification on the deployment host.

Reminder scheduling is transactional and uses unique idempotency keys.
Workers claim jobs with leases, renew active leases, stop after three attempts,
and park failures for review. Unknown delivery outcomes are not retried
automatically. Failed cleanup jobs keep their object references until an owner
reviews them.

Migrations through `0011` were applied to disposable PostgreSQL 17 databases.
The regression suite covers concurrent claims, stale leases, bounded retry,
uncertain delivery, retention, revocation, account cleanup, expired retrieval,
stale analysis fencing, frozen snapshots, transaction removal, and concurrent
signup, encrypted queue payloads, legacy AI key sealing, and jobless reminder
repair. Migration `0009` rejects a legacy database with multiple accounts using
a clear error instead of deleting data. Migrations `0010` and `0011` move queue
payloads to a sealed text format with indexed non-sensitive routing fields.

Temporary analysis copies are encrypted in object storage. Consent is recorded
and derived text expires after 30 days. Retrieval checks consent and expiry at
query time, so expired text is blocked even before maintenance removes it.
Account deletion and analysis writes use database locks and lease fences to
avoid stale results recreating removed data. Operators still need a storage
lifecycle rule because object deletion depends on a healthy worker.

`DATA_ENCRYPTION_KEY` protects job payloads, filing snapshots, transaction
facts, review notes, and the stored AI API key. The backup tool uses a separate
key and authenticated streaming encryption. A database backup and scratch
restore succeeded. Bucket restore was not tested.

The deterministic compliance module now rolls federal weekends and holidays.
Owners can record encrypted transaction facts, freeze complete filing
snapshots, download them, record one review, and remove facts from future
snapshots without rewriting old ones.

The current ordinary suite has 119 tests. The PostgreSQL suite has 11 tests.
Two Chromium workflows cover owner access and signed-out denial. These tests do
not establish tax accuracy or production capacity.

TypeScript, ESLint, Oxlint, Prettier, dependency checks, duplicate checks, and
both production builds pass. The Workers build still reports dependency
annotation warnings and a client chunk above 500 KB. All three Compose files
parse successfully, but the Docker daemon was unavailable, so no image or
container was built or started.

Still open: no live AI, SMTP, Resend, or WhatsApp provider call was made during
this work. Docker and production Compose were not run. Scanned PDFs need OCR,
the vault list and thread sidebar remain unpaginated, and the Workers client
chunk still needs profiling. Professional tax review, a full bucket restore,
provider verification, and deployment-specific memory testing remain release
requirements.

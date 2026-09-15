# Self-hosted operations

Pax remains single-user. A future customer model is undecided. No paid
service is required.

## Deploy

Use Node 22 or newer and PostgreSQL 16 or newer. Copy `.env.example` to
`.env.production`, set real secrets, and point it at your own database and
S3-compatible bucket. Container URLs must be reachable from containers,
not only from the host. Generate independent 32-byte base64 values for
`DATA_ENCRYPTION_KEY` and `BACKUP_ENCRYPTION_KEY`.

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml --profile maintenance run --rm migrate
docker compose -f docker-compose.production.yml up -d app worker
```

Back up before migrating. Migrations through `0011` are required. Migration
0008 expires old analysis without inventing historical consent. Vault files
are unchanged. Migration 0009 enforces one owner at the database level. It
stops with a clear error if an older database contains multiple accounts
instead of deleting or merging them. Migrations 0010 and 0011 add queue routing
fields, repair old jobless reminders, and prepare legacy job payloads for
encryption. Run the worker after upgrading so it seals any remaining plaintext
legacy job payloads. New payloads are encrypted when they are queued. The worker
also removes expired derived text; users can re-analyze documents under the
current disclosure.

Terminate HTTPS at a reverse proxy in front of port 3000. The production
Compose port binds only to loopback. Configure request body limits and
upload timeouts at the proxy and storage endpoint. Do not expose the local
development Compose stacks to the internet; their keys are public fixtures.

The worker's container has a 512 MB memory limit, including parser children.
Its 128 MB V8 parser limit alone does not limit total RSS. Docker runtime
limits require validation on your deployment host.

## Watch and recover work

Settings shows recent worker health and failed work. Deep readiness is
`GET /api/health?deep=true` with `x-internal-secret`; never put the secret in a
monitor's URL or logs. A missing worker, database failure, or storage failure
returns 503. Poll it with your existing monitor and alert on sustained failure.

Jobs stop after three attempts. Failed jobs remain until reviewed; successful
and cancelled jobs expire after seven days. Operation metadata expires after
90 days. Settings can retry failed cleanup and definitively failed reminders
after a recent sign-in. Unknown delivery outcomes need provider reconciliation
before any resend. Do not blindly change their status. Re-submit failed
document analysis from Documents, since its staged bytes may have expired.

Revocation blocks new extraction writes and future retrieval. It cannot retract
bytes already sent to a provider or quotes saved in chats, reviewed notices,
filing snapshots, or backups. Searchable analysis expires after 30 days.
Physical cleanup needs a running worker. Set a one-day storage lifecycle rule
for `processing/` as an independent safety net, including old object versions.
Account and document deletion defer vault-object cleanup for 24 hours to
allow previously issued upload URLs to expire. Failed cleanup jobs are retained.

## Backup and restore drill

Install `pg_dump` and `pg_restore` matching the server's major version or newer.
The backup command streams a custom-format dump into AES-256-GCM encryption,
refuses to overwrite files, and never puts credentials in command arguments.

```bash
pnpm backup create /absolute/protected/pax-2026-09-15.pax
```

Schedule this with your system scheduler, protect the directory, and retain
daily backups for 30 days unless your own retention policy requires otherwise.
Back up the bucket separately with your storage provider's versioning or
replication tools. Keep both encryption keys and the auth secret separately.
The database archive alone cannot recover vault objects.

Create an empty disposable database whose name ends in `_restore`. Set
`RESTORE_DATABASE_URL` and run:

```bash
pnpm backup restore-test /absolute/protected/pax-2026-09-15.pax
```

The tool authenticates the whole archive before restoring, refuses nonempty
targets, and removes its private temporary plaintext file. Check row counts
and open representative vault files against a separately restored bucket.
Do not enable a worker on a restored database before deciding whether its
pending reminders should run. Recovery restores the state captured by the
backup, including previously deleted information.

## Account and provider checks

Password reset is available at `/recover` when SMTP or Resend is configured.
It revokes existing sessions. It cannot recover a forgotten vault passphrase.
Store authenticator recovery codes and register a second passkey beforehand.

`pnpm ai:evaluate` sends synthetic prompts to the configured provider to check
tool execution and a source-backed follow-up answer. It can incur provider
costs and must be run explicitly. It is not a tax accuracy certification.

Before relying on filings, obtain independent professional review of the
versioned rules and source revisions. Test real email delivery and your chosen
provider, perform a bucket restore drill, and measure memory under your own
documents and concurrency. These checks cannot be inferred from a build.

# Product maturity review

## Current position

Pax is a private-beta, self-hosted tool for one owner. It can track entities,
tasks, reminders, notices, filing facts, and documents. Its tax output is a
planning aid. It is not a tax return system or an unattended compliance
service.

The current product decision is single-user self-hosting. A future hosted
customer model is undecided. Tenancy, billing, plans, seats, and collaborator
access are outside the current scope.

## What is implemented

The tax copilot uses deterministic rules rather than asking the model to choose
the filing route. It distinguishes foreign-owned disregarded entities,
domestic disregarded entities, partnerships, C corporations, S corporations,
and cases that need manual review. Federal deadlines roll weekends and the
versioned federal holiday calendar. Noncalendar tax years route to review.

Owners can record encrypted related-party transaction facts, create immutable
assessment snapshots, download the complete snapshot, and record one review
with encrypted notes. Removing a fact changes future snapshots but does not
rewrite an existing one.

Document analysis requires explicit consent. The readable processing copy is
encrypted in temporary storage, parsed by the Node worker, and may be sent to
the configured AI provider. Searchable derived text is readable by the server
and expires after 30 days. Revocation removes it from retrieval and fences out
stale analysis attempts.

The PostgreSQL worker provides leased job claims, three bounded attempts,
manual retry for safe failure classes, retained cleanup failures, heartbeat
status, and retention maintenance. Settings shows sanitized operational status.
Deep health checks cover PostgreSQL, object storage, and worker recency.

Authentication includes password sign-in, password reset by email, optional
Google sign-in, authenticator codes, recovery codes, and passkeys. Sensitive
settings and account deletion require a recent sign-in. A constant unique
database index enforces the single-owner rule during concurrent signup.

## Known limits

The filing fact model is still narrower than a complete tax organizer. Pax
does not create complete returns, validate every form field, collect signatures,
transmit filings, or reconcile agency acknowledgements. State coverage remains
small and simplified. No golden tax-case suite has been approved by a CPA or
EA.

The Form 5472 classifier uses keywords. It cannot prove transaction character,
valuation, direction, or completeness. Fiscal-year and unsupported election
cases route to review rather than receiving an automatic answer.

Search uses PostgreSQL lexical full-text retrieval. Scanned PDFs need external
OCR, and image analysis needs a vision-capable model. The vault list and chat
thread sidebar are not paginated for very large archives.

The parser has a V8 heap limit, not a hard total-memory guarantee. The
production worker container has a separate memory limit, but that container has
not been run under a deployment-specific load test. Cleanup also depends on a
healthy worker and storage lifecycle configuration.

Provider compatibility has a synthetic command, but no real AI provider,
SMTP, Resend, or WhatsApp delivery was exercised during this hardening pass.
The encrypted PostgreSQL backup and scratch restore were tested. A matching
bucket restore was not.

## Verification

The current local checks include 119 Vitest unit and integration tests, 11
PostgreSQL regression tests, and 2 Chromium workflow tests. The database tests
cover queue concurrency, lease fencing, bounded retries, uncertain reminder
delivery, retention, revocation, account cleanup, expired retrieval, concurrent
signup, and frozen filing snapshots.

These numbers describe the repository checks, not tax accuracy. Coverage
thresholds target selected infrastructure files rather than the full
application.

## Release requirements

Before treating Pax as a filing system, complete all of the following:

1. Obtain independent professional review of every supported filing route,
   deadline rule, warning, and source revision.
2. Add reviewed golden cases across the supported tax years and owner profiles.
3. Test the chosen AI, email, and messaging providers with real credentials and
   failure recovery.
4. Run the production containers on the intended host and measure memory,
   storage cleanup, restart behavior, and backup recovery under representative
   documents.
5. Restore PostgreSQL and the object bucket together, then open representative
   vault files.
6. Define and test the supported state and tax-year scope. Keep unsupported
   cases routed to review.

Until those checks are complete, keep the private-beta label and require manual
professional review for filing decisions.

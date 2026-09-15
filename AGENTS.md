# Agent instructions

## Scope: single-user

Pax is a self-hosted, single-user product. One instance holds one account, and
signup locks after the first user.

Treat a hosted multi-customer product as undecided. Keep authorization based on
ownership. Add tenancy, billing, plans, seats, or customer isolation only after
an explicit product decision changes this scope.

## Preserve these boundaries

- **Document analysis is asynchronous and Node-only.** HTTP routes enqueue work
  for the PostgreSQL-backed worker in `scripts/worker.ts`. PDF and DOCX parsing
  runs in a child process there, never inside a web request.
- **Server encryption has one implementation.** Persist user-sensitive server
  data through `src/infrastructure/security/server-encryption.ts`.
  `DATA_ENCRYPTION_KEY` is a base64-encoded 32-byte key and currently protects
  job payloads, filing snapshots, transaction facts, and the stored AI API key.
- **Vault encryption is a separate client boundary.** The client encrypts vault
  uploads. The server decrypts a vault file only during the explicit,
  user-consented analysis flow.
- **Reminder delivery belongs to the worker.** Cron endpoints enqueue reminders.
  The worker delivers them. A unique `idempotency_key` deduplicates delivery.
- **Compliance calculations are deterministic.**
  `src/modules/compliance/deadlines.ts` rolls deadlines over weekends and
  federal holidays. Version rule changes with `COMPLIANCE_RULE_VERSION`.

## Change rules

- **Tests:** use explicit service objects and method spies. The Oxlint
  anti-slop configuration rejects `vi.mock`; preserve that rule.
- **Migrations:** edit `src/lib/schema.ts`, then run `pnpm db:generate`. Preserve
  applied migrations. Make destructive backfills defensive; use the
  duplicate-key backfill in `drizzle/0007` as the model.
- **Claims:** describe only verified behavior. Claims of professional tax
  review, live-provider verification, or production readiness require evidence
  that the work occurred.
- **Repository workflow:** follow `CONTRIBUTING.md` for branch, test, and PR
  conventions. Use the `pnpm` scripts in `package.json` as the command source of
  truth.

## Completion

Validate every changed behavior with the narrowest relevant check, then run:

```bash
pnpm typecheck &&
pnpm test &&
pnpm lint &&
pnpm run lint:oxlint &&
pnpm format
```

For migration or queue changes, also validate against a disposable PostgreSQL
instance created under `/tmp`. Account for every failure or skipped check in
the final report.

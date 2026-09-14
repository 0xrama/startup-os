# Product maturity review

## Current position

Pax is a working MVP for a self-hosted owner who understands that the tax output is a planning aid. It is not yet a production tax filing system or an unattended compliance service.

The main workflows are connected: onboarding creates an entity profile and compliance tasks, the filing page runs a deterministic federal filing assessment, documents can be stored in the vault, reminders can be scheduled, and the assistant can retrieve IRS guidance with citations. The repository also has deployment configs, migrations, CI, health and metrics endpoints, and an operations runbook.

A reasonable release label is **private beta**. The app has more depth than a prototype, but the tax engine, test coverage, recovery paths, and operational controls need more work before users should rely on it for filing decisions without professional review.

## Tax copilot implementation

The tax copilot has three layers.

1. `src/lib/tax-copilot.ts` is a deterministic rules module. It routes saved profiles to foreign-owned disregarded entity, domestic disregarded entity, partnership, C corporation, S corporation, or manual review. It calculates basic due dates, builds preparation checks, and classifies Form 5472 transaction descriptions with regular expressions.
2. `src/components/dashboard/tax-copilot-summary.tsx` presents the assessment on the filing page, merges decrypted EIN and member data when the vault is unlocked, and links the result to official IRS sources.
3. The assistant receives the same filing assessment and exposes it through tools in `src/lib/ai-tools.ts`. PostgreSQL full-text search supplies excerpts and citations from the embedded guidance, synced IRS documents, and eligible uploaded documents.

### What is solid enough for an MVP

- The main federal classification paths are explicit and testable.
- Form 5472 with a pro forma Form 1120 is separated from a normal Form 1120 filing.
- Multi-member LLCs are routed to Form 1065 instead of Form 5471.
- The output includes reasons, warnings, next steps, forms, filing method, and source links.
- The model is not solely responsible for filing classification. The assistant receives deterministic results.
- Official guidance carries form revision and source URL metadata.
- The current unit suite covers the key filing routes and several Form 5472 transaction examples.

### Why it is not a production tax unit

- The assessment uses a small profile, not a complete tax organizer. It does not capture a general ledger, transaction amounts, related parties, elections, prior filings, income, deductions, withholding, nexus, or owner return facts.
- The Form 5472 classifier is keyword based. It cannot establish the legal character, direction, valuation, or completeness of a transaction.
- Due-date logic rolls weekends but does not maintain a federal holiday calendar. State deadlines are a small hard-coded map and use separate date logic.
- Guidance is versioned in code, but there is no approval workflow that proves a rule was reviewed before it became active.
- The product prepares guidance and checklists. It does not generate complete tax returns, validate form fields, obtain signatures, transmit filings, or reconcile IRS acknowledgements.
- Encrypted documents cannot currently be processed by the server-side document intelligence path. This limits the promise that the assistant can use private vault files while preserving end-to-end encryption.
- Tax conclusions have unit coverage, but there are no golden tax cases reviewed by a CPA or EA and no regression suite across tax years.

## Authentication and account security

The app supports password sign-in and optional Google OAuth. This review adds two user-controlled security options:

- Authenticator-app TOTP codes with single-use recovery codes and an optional 30-day trusted-device cookie.
- WebAuthn passkeys for device biometrics, device PINs, password managers, and hardware security keys.

Users manage both options on the account page. The login page supports password, passkey, and Google sign-in. Password sign-in redirects to a separate code verification page when TOTP is enabled.

Passkeys require a stable HTTPS origin in production. `PASSKEY_RP_ID` and `PASSKEY_ORIGIN` can override values derived from the public app URL.

Two limits should be kept visible in the product requirements:

- In the installed Better Auth version, authenticator-code enrollment requires a credential password. A social-only account can still use Google and passkeys.
- Passkey and social sign-in are passwordless flows and are not followed by the TOTP challenge. Passkeys are phishing-resistant, but this does not satisfy a policy that requires two separate factors on every sign-in. Such a policy needs a custom step-up authentication flow.

## Maturity by area

| Area                 | Current level              | Notes                                                                                                                                    |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Product workflow     | MVP                        | Onboarding, entities, tasks, filing summary, documents, reminders, notices, and assistant are connected.                                 |
| Federal tax guidance | MVP                        | Useful for common LLC routes, but the fact model and reviewed case coverage are too narrow for filing reliance.                          |
| State compliance     | Prototype                  | Only a small set of states and simplified deadlines are represented.                                                                     |
| AI assistant         | MVP                        | Tool use and citations exist. Retrieval is lexical, and encrypted files cannot be processed.                                             |
| Document vault       | MVP with a design conflict | Client-side encryption works, but encrypted files cannot feed server-side extraction, scanning, or retrieval.                            |
| Authentication       | MVP                        | Password, Google, TOTP, recovery codes, trusted devices, and passkeys are available. Recovery and step-up policies need more work.       |
| Testing              | Early MVP                  | CI is broad, but there are only 33 automated tests and one integration test. The coverage percentage is limited to three selected files. |
| Operations           | Early MVP                  | Deployments, cron, logs, health, and metrics exist. Health is liveness-only and metrics are in-memory.                                   |
| Production readiness | Private beta               | Suitable for controlled use with manual review, not as the system of record for tax filing.                                              |

## Recommended build plan

### P0: correctness and user safety

1. Define the supported tax scope by entity type, owner type, form, state, and tax year. Route every unsupported case to review.
2. Replace duplicate deadline calculations with one versioned deadline service that includes federal holidays, state rules, extensions, and source metadata.
3. Add a structured related-party transaction ledger for amount, currency, date, direction, counterparty, relationship, accounting treatment, evidence, and reviewer status.
4. Build a reviewed tax-case suite. Each case should contain inputs, expected forms, expected warnings, deadlines, and the source revision used for approval.
5. Resolve the encrypted-document conflict. Choose client-side extraction, an explicit server-readable copy, or a mode where private files are excluded from AI features.
6. Add end-to-end tests for signup, onboarding, TOTP enrollment and login, passkey registration and login, document upload, task completion, reminder scheduling, and assistant access control.

### P1: production controls

1. Add database, object-storage, and provider readiness checks. Keep the current health route as liveness.
2. Add durable metrics and alerting for failed reminders, document processing, assistant errors, auth failures, and stale jobs.
3. Add queue claiming or database locks so two reminder workers cannot process the same row.
4. Encrypt the stored AI API key or move it to a secret manager.
5. Add password reset, email verification, session management, recent-auth checks for sensitive actions, and security-event audit entries.
6. Add security headers, a content security policy, dependency scanning gates, and an upload malware policy. Encrypted uploads need a separate policy because the server cannot inspect them.
7. Replace the 4 to 6 digit vault PIN as the only low-friction key wrapper with a stronger passphrase or a hardware-backed derivation option. Keep the high-entropy recovery code.

### P2: filing product

1. Generate reviewable workpapers and populated draft forms from structured facts.
2. Add reviewer sign-off, change history, source revision pinning, and an evidence trail for every material field.
3. Integrate filing transmission only after form validation, signature, consent, acknowledgement, rejection handling, and retention rules are defined.
4. Expand state coverage one jurisdiction at a time with dated source material and regression cases.

## Release gate for a production tax product

Do not market Pax as a production filing unit until the supported scope is explicit, every supported route has reviewed cases, deadlines use authoritative calendars, encrypted-document behavior matches the product promise, critical workflows have end-to-end tests, and operations can detect and recover from failed jobs.

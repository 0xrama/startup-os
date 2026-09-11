# Vendored anti-slop Oxlint plugin

## Source identity

- Source repository: unknown; this installation came from the bundled `install-anti-slop` skill asset.
- Exact source commit: unknown.
- Recoverable pristine snapshot: `/Users/sriram/code/startup-os/.agents/skills/install-anti-slop/assets/anti-slop`.
- Installed asset manifest SHA-256: `69fa217ad6262822167aeaa4b4cf9d10bddbba0bd9fcb7f83e1807f3707bdca3`.
- The manifest was computed over every copied file under `tools/oxlint/anti-slop` (excluding this record), using sorted relative paths and SHA-256 file digests.

## Installed paths

- Generic plugin entry point: `tools/oxlint/anti-slop/index.ts`
- Generic rules: `tools/oxlint/anti-slop/rules/`
- Shared generic helpers: `tools/oxlint/anti-slop/shared/`
- Optional Effect plugin entry point: `tools/oxlint/anti-slop/effect/index.ts`
- Vendored ESLint Stylistic compatibility code: `tools/oxlint/anti-slop/vendor/eslint-stylistic/`
- Vendored license and upstream record are retained under `vendor/eslint-stylistic/`.

## Local configuration and deviations

- The generic plugin is registered by `oxlint.config.ts` as `anti-slop` and all generic anti-slop rules are enabled at `error`, together with `oxc/no-accumulating-spread`.
- The optional Effect plugin is copied with the bundled assets but is intentionally not registered because this repository has no direct `effect` dependency.
- The vendored plugin and installed agent assets are excluded from Oxlint, ESLint, Prettier, TypeScript project input, and duplicate detection as appropriate for non-application tooling.
- No upstream source commit could be established; the bundled skill snapshot and manifest hash identify the actual copied assets without guessing a revision.

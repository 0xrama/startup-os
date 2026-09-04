# Contributing

Keep this repo boring to review.

## Branches and PRs

- Branches should use the `codex/` prefix unless there is a good reason not to.
- Open a PR with a short problem statement, the change, and how you verified it.
- If you change behavior, include screenshots or API examples when they help.

## Labels

The issue templates and PR template assume this label set:

- `bug`
- `feature`
- `docs`
- `observability`
- `security`
- `triage`

## Tests

- Unit tests: `tests/unit/*.test.ts`
- Integration tests: `tests/integration/*.test.ts`
- Prefer direct imports for route handlers and pure helpers before reaching for full browser tests.

## Before opening a PR

```bash
npm run lint
npm run format
npm run test:ci
```

If you touch shared infrastructure, also run:

```bash
npm run knip
npm run lint:duplicates
npm run lint:todo
npm run lint:large-files
```

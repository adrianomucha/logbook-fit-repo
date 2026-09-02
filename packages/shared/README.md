# @logbook/shared

What the web app (`/src`) and the native app (`/mobile`) both need and
neither should own: API response types, zod request schemas, the API →
domain adapters, and pure helpers (rep formatting, superset grouping,
plan-week math, timezone checks, check-in display labels).

Rules for what goes in:

- Pure TypeScript. No `window`, no `next/*`, no React, no Prisma.
- Anything here is consumed as source — there is no build step. Metro and
  Next both compile it in place.
- Tests live next to the code (`__tests__/`) and run with the root
  `npm test`.

The web app imports through its old `@/lib/...` and `@/types` paths, which
are one-line re-exports into this package, so moving a module here never
touches its callers.

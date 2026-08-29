# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Architecture

- Next.js 15 App Router, TypeScript, Prisma/Postgres. Business logic (budget
  evaluation, alert formatting/dispatch, scheduling due-checks, Lighthouse
  metric extraction, auth) lives in small pure(ish) modules under `src/lib/`
  - keep new logic there, not inline in a route handler or Server Component.
- Single admin password (`ADMIN_PASSWORD` env var), no user table, no
  multi-tenant orgs. Session is a signed JWT cookie (`src/lib/session-token.ts`,
  edge-safe: no `node:crypto`, importable from `middleware.ts`). Password
  comparison (`src/lib/auth.ts`) uses `node:crypto` and must never be
  imported from `middleware.ts` - that's why session-token logic is a
  separate module from password-check logic.
- Admin mutations (create project/page, budgets, alert channels, manual run
  trigger) are Next Server Actions in `src/lib/actions.ts`, not API routes.
  The one real HTTP API route, `src/app/api/pages/[pageId]/runs/route.ts`,
  exists specifically for external callers (CI, webhooks) authenticated by a
  per-project API token (`Project.apiToken`, constant-time compared via
  `src/lib/compare.ts`'s `safeEqual`) - don't add new API routes for things
  the dashboard itself can do via a Server Action.
- The scheduler (`src/lib/scheduler-loop.ts`, `node-cron`) runs in-process
  inside the same Node server as the Next.js request handler (`server.ts`,
  run via `tsx` since it needs to import TS lib code directly) - this is why
  Docker Compose only needs two services (`app`, `db`). `npm run dev` (plain
  `next dev`) does **not** start the scheduler; use `docker compose up
  --build` or `npm start` to exercise scheduled/webhook run-triggering.
- `next.config.ts` marks `lighthouse` and `chrome-launcher` as
  `serverExternalPackages` - without that, webpack chokes on Lighthouse's
  internal `import.meta`/dynamic-require usage at build time.
- INP is a field metric (requires real user interactions) and cannot be
  produced by a synthetic Lighthouse lab run. Total Blocking Time (TBT) is
  Google's own documented lab-mode proxy and is what Perfnest tracks/budgets
  instead - there is no `inp` field/enum value anywhere on purpose. See the
  README's "Metrics" section before reintroducing one.

## Build, test, release

- `npm run dev` for UI-only work (no scheduler). `docker compose up --build`
  to exercise the full stack including the scheduler and real Lighthouse
  runs against Chromium installed in the image.
- `npm test` (Vitest) runs pure-logic unit tests unconditionally; the
  integration suite in `tests/` (`executeRun` against a real Postgres) is
  gated on `DATABASE_URL` being set and skips automatically otherwise. CI
  always sets it (Postgres service container). See CONTRIBUTING.md for the
  local `DATABASE_URL` workflow.
- `npm run seed` (`scripts/seed.ts`) populates a "Demo" project with 40
  synthetic runs including a deliberate regression + recovery arc and a
  budget breach, for local exploration and the README's demo screenshot.
  Re-running it deletes and recreates the "Demo" project (idempotent).
- Releases: push a `vX.Y.Z` tag. `scripts/release_notes.sh` extracts that
  version's CHANGELOG section (fails the release if missing) and
  `.github/workflows/release.yml` builds/pushes
  `ghcr.io/laaaaksh/perfnest:vX.Y.Z` + `:latest`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

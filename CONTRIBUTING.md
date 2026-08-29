# Contributing to Perfnest

Thank you for your interest in contributing. Perfnest is a self-hosted web
performance monitoring and budget alerting tool, open source under the MIT
license.

## Getting started

```bash
git clone https://github.com/<your-username>/perfnest.git   # your fork, see below
cd perfnest
npm install
cp .env.example .env   # fill in ADMIN_PASSWORD and AUTH_SECRET
docker compose up -d db
npm run db:migrate:dev
npm run dev
```

`npm run dev` runs the Next.js dev server only — it does not start the
scheduler loop (that only runs under `npm start` / the Docker image, see
`server.ts`). For UI and API work that's fine; if you're changing scheduler
or run-triggering logic, test it with `docker compose up --build` instead.

## Requirements

- Node.js 20+
- Docker (for Postgres locally, and to run the full stack the way it ships)

## Contribution workflow

The `master` branch is protected: every change lands through a pull request,
required status checks must pass, and protection is enforced for everyone —
including the maintainer. There are no direct pushes to `master`.

1. Fork the repo on GitHub, then clone your fork (command above).
2. Create a descriptively named feature branch from `master`.
3. Make your changes as small, focused commits, each leaving the tree buildable.
4. Run `make lint` and `make test` — both must pass.
5. If your change is user-facing (a feature, fix, or behavior change), add
   one bullet under the `Unreleased` heading in [CHANGELOG.md](CHANGELOG.md).
6. If your change touches `prisma/schema.prisma`, generate a migration with
   `npm run db:migrate:dev` and commit the generated `prisma/migrations/`
   directory - never hand-edit a migration that's already been committed.
7. Push the branch to your fork.
8. Open a pull request against `master` here.

A PR can merge only when every required check passes (`Test`, `Lint`,
`Build`) and all conversation threads are resolved.

### Running the test suite

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # vitest
```

Most of the test suite is pure-logic unit tests (budget evaluation, alert
formatting, scheduler due-checks, auth) and needs nothing running. A smaller
set of integration tests in `tests/` exercises `executeRun` against a real
Postgres database and is skipped automatically when `DATABASE_URL` isn't
set. To run those too:

```bash
docker compose up -d db
DATABASE_URL=postgresql://perfnest:perfnest@localhost:5432/perfnest npm run db:migrate:dev
DATABASE_URL=postgresql://perfnest:perfnest@localhost:5432/perfnest npm test
```

If port 5432 is already in use on your machine, set `DB_HOST_PORT` (in
`.env` or inline) to publish the `db` service on a different host port, and
point `DATABASE_URL` at that port instead.

These tests inject a fake Lighthouse runner - no headless Chrome or network
access is needed to run them. CI always runs the full suite, including
integration tests, against a Postgres service container.

## Releases

Releases are cut by pushing a tag; GitHub Actions does the rest
(`.github/workflows/release.yml`):

1. Make sure every user-facing change since the last release has a bullet
   under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) (step 5 above).
2. Give the release its own changelog section: insert `## [x.y.z] -
   YYYY-MM-DD` above the (now empty) `## [Unreleased]` heading, following
   the format of the existing sections, and update the compare links at the
   bottom of the file.
3. Land those changelog edits on `master` through a pull request, then tag
   and push:

   ```bash
   git tag vx.y.z && git push origin vx.y.z
   ```

The workflow extracts the tagged version's CHANGELOG section as the GitHub
release notes (`scripts/release_notes.sh`: if the version has no heading
yet, the release fails loudly rather than publishing empty notes), then
builds and pushes `ghcr.io/laaaaksh/perfnest:vx.y.z` and `:latest`.

## Code style

- Standard `eslint` formatting (enforced by CI); TypeScript throughout, no `any`.
- Business logic (budget evaluation, alert formatting, scheduling, metric
  extraction) lives in small, pure, unit-tested modules under `src/lib/` -
  keep new logic there rather than inline in a route handler or a React
  Server Component, so it can be tested without a database or a browser.
- Server Actions (`src/lib/actions.ts`) are for admin-triggered mutations
  from the dashboard UI. The one real HTTP API route
  (`src/app/api/pages/[pageId]/runs/route.ts`) exists specifically for
  external callers (CI pipelines, webhooks) authenticated by a project's API
  token - don't add new API routes for things the dashboard itself can do
  via a Server Action.
- Every constant-time secret comparison goes through `src/lib/compare.ts`'s
  `safeEqual` - never `===` on a password or token.

## Reporting issues

Please open a GitHub issue before starting large changes or proposing new
features, so scope and approach can be settled before code is written. Bug
reports should include how you're running Perfnest (docker compose, source
checkout) and steps to reproduce.

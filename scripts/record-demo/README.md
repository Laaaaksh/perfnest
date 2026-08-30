# record-demo

Records the `docs/assets/demo.mp4` / `demo.gif` walkthrough by driving the
real Perfnest UI with Playwright against a genuinely running stack. This is a
standalone dev tool - its `package.json` is separate from the product's so
Playwright never becomes a dependency of the app build.

## What it records

Against a freshly seeded stack, `record.mjs`:

1. Signs in with `ADMIN_PASSWORD`.
2. Creates a project and adds a page pointed at `https://example.com`.
3. Triggers two real "Run now" checks - genuine Lighthouse runs, not
   canned data - to build a short trend.
4. Sets a 1200ms LCP budget (comfortably above example.com's real ~760ms LCP,
   so both baseline runs pass).
5. Points the page at a real, heavier Wikipedia article (standing in for "a
   deploy shipped a heavier page") and runs again - this run's real LCP
   (~4200ms) genuinely breaches the budget.
6. Scrolls to show the trend chart's line crossing the red budget line, then
   returns to the project overview to show the regressed score badge.

Every metric in the recording comes from the app's own `runLighthouse()` -
nothing is scripted or faked. Re-running against a fresh stack repeats the
same walkthrough; only the exact millisecond timings Lighthouse reports will
differ slightly run to run.

## Why the minute-boundary wait

Perfnest's in-process scheduler (`src/lib/scheduler-loop.ts`) checks every
minute for pages that have never run and runs them immediately. A page this
script just created has no prior run, so if the scheduler's once-a-minute
tick lands in the few seconds between page creation and this script's own
first "Run now", both try to launch Lighthouse at once and one run fails
(`the "start lh:storage:clearDataForOrigin" performance mark has not been
set`). `make demo` waits for a fresh minute boundary before recording so the
whole vulnerable window (page creation through the first successful run,
~10-15s) has a wide safety margin before the next tick. If you run
`record.mjs` directly instead of via `make demo`, do the same: start it just
after `:00` seconds.

## Running it

```bash
# from the repo root: boot, seed, record, and convert in one step
make demo

# or drive the steps yourself
docker compose up -d --build
cd scripts/record-demo
npm install
npx playwright install chromium
npm run record   # writes output/demo-raw.webm
```

Then convert the raw capture (see the `demo` Makefile target for the exact
`ffmpeg` invocations used for `docs/assets/demo.mp4` and `demo.gif`).

Requires `ADMIN_PASSWORD` and `PUBLIC_BASE_URL` to be set in the repo root
`.env` (loaded automatically via `dotenv`).

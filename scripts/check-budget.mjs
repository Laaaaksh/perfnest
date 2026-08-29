#!/usr/bin/env node
// Triggers a Perfnest run for one page and exits non-zero if it failed or a
// budget was breached - designed to be the last step of a deploy pipeline,
// wired to the pipeline's own pass/fail status.
//
// Usage:
//   node scripts/check-budget.mjs --base-url https://perf.example.com \
//     --page-id <pageId> --token <projectApiToken> [--deploy-id <sha>]
//
// Every flag can also come from an env var: PERFNEST_BASE_URL,
// PERFNEST_PAGE_ID, PERFNEST_TOKEN, PERFNEST_DEPLOY_ID.

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      out[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const baseUrl = args["base-url"] ?? process.env.PERFNEST_BASE_URL;
const pageId = args["page-id"] ?? process.env.PERFNEST_PAGE_ID;
const token = args["token"] ?? process.env.PERFNEST_TOKEN;
const deployId = args["deploy-id"] ?? process.env.PERFNEST_DEPLOY_ID ?? null;

if (!baseUrl || !pageId || !token) {
  console.error(
    "Usage: check-budget.mjs --base-url <url> --page-id <id> --token <token> [--deploy-id <sha>]\n" +
      "(or set PERFNEST_BASE_URL, PERFNEST_PAGE_ID, PERFNEST_TOKEN, PERFNEST_DEPLOY_ID)"
  );
  process.exit(2);
}

const url = `${baseUrl.replace(/\/$/, "")}/api/pages/${pageId}/runs`;

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ deployId }),
});

const body = await response.json();

if (!response.ok) {
  console.error(`perfnest: run failed (HTTP ${response.status}): ${body.error ?? body.errorMessage ?? "unknown error"}`);
  process.exit(1);
}

console.log(`perfnest: run ${body.runId} finished - ${body.status}`);
if (body.metrics) {
  console.log(`  performance score: ${body.metrics.performanceScore}`);
  console.log(`  LCP: ${body.metrics.lcp}ms  TBT: ${body.metrics.tbt}ms  CLS: ${body.metrics.cls}  FCP: ${body.metrics.fcp}ms`);
}

if (!body.budgetPassed) {
  console.error("perfnest: budget exceeded:");
  for (const breach of body.breaches) {
    console.error(`  - ${breach.metric}: ${breach.actual} (budget: ${breach.threshold})`);
  }
  process.exit(1);
}

console.log("perfnest: all budgets passed");

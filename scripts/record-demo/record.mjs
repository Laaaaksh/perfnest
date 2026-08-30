/**
 * Records a real end-to-end walkthrough of Perfnest: create a project and a
 * monitored page, trigger genuine Lighthouse runs against real URLs, set a
 * budget, and show it breached on the trend chart after the monitored page
 * gets heavier. Every metric shown is produced by the app's own Lighthouse
 * runner - nothing here is scripted or faked. Re-running this against a
 * freshly seeded stack repeats the same walkthrough, since the target URLs
 * (example.com, a fixed Wikipedia article) are stable and the actions are
 * fixed - only the exact millisecond timings Lighthouse reports will vary.
 *
 * Usage: from this directory, `npm install && npx playwright install
 * chromium && npm run record`. See README.md for details.
 */
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { mkdtempSync, readdirSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../../.env") });

const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is not set - copy .env.example to .env and set it before recording.");
}

const OUTPUT_DIR = path.join(__dirname, "output");
const FINAL_VIDEO = path.join(OUTPUT_DIR, "demo-raw.webm");

const PROJECT_NAME = "Acme Marketing Site";
const PAGE_LABEL = "Homepage";
const BASELINE_URL = "https://example.com";
// A real, stable Wikipedia article - genuinely heavier than example.com, used
// to produce a real budget breach after the baseline runs (standing in for
// "a deploy shipped a heavier page") without fabricating any numbers.
const HEAVIER_URL = "https://en.wikipedia.org/wiki/Lighthouse";
const LCP_BUDGET_MS = 1200;

function pause(page, ms) {
  return page.waitForTimeout(ms);
}

async function getRunRowCount(page) {
  return page.evaluate(() => {
    const tables = document.querySelectorAll("table");
    const runTable = tables[tables.length - 1];
    if (!runTable) return 0;
    const rows = Array.from(runTable.querySelectorAll("tbody tr"));
    const isEmptyState = rows.length === 1 && rows[0].textContent.includes("No runs yet");
    return isEmptyState ? 0 : rows.length;
  });
}

async function triggerRunAndWait(page, previousCount, timeoutMs = 40000) {
  await page.click('button:has-text("Run now")');
  await page.waitForFunction(
    (count) => {
      const tables = document.querySelectorAll("table");
      const runTable = tables[tables.length - 1];
      if (!runTable) return false;
      const rows = Array.from(runTable.querySelectorAll("tbody tr"));
      const isEmptyState = rows.length === 1 && rows[0].textContent.includes("No runs yet");
      const current = isEmptyState ? 0 : rows.length;
      return current > count;
    },
    previousCount,
    { timeout: timeoutMs }
  );
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const videoDir = mkdtempSync(path.join(tmpdir(), "perfnest-demo-"));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  try {
    // --- Sign in ---
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await pause(page, 700);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await pause(page, 400);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    await pause(page, 900);

    // --- Register a target site: create a project ---
    await page.locator('input[name="name"]').click();
    await page.locator('input[name="name"]').pressSequentially(PROJECT_NAME, { delay: 35 });
    await pause(page, 400);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/dashboard\/[^/]+$/);
    await pause(page, 900);

    // --- Add a page to monitor ---
    await page.fill('input[name="label"]', PAGE_LABEL);
    await pause(page, 250);
    await page.locator('input[name="url"]').click();
    await page.locator('input[name="url"]').pressSequentially(BASELINE_URL, { delay: 25 });
    await pause(page, 500);
    await page.click('button:has-text("Add page")');
    await page.locator(`a:has-text("${PAGE_LABEL}")`).waitFor({ state: "visible" });
    await pause(page, 900);

    // --- Open the page and run two real checks to build a trend ---
    await page.click(`a:has-text("${PAGE_LABEL}")`);
    await page.waitForURL(/\/dashboard\/[^/]+\/pages\/[^/]+$/);
    await pause(page, 900);

    let runCount = await getRunRowCount(page);
    await triggerRunAndWait(page, runCount);
    runCount = await getRunRowCount(page);
    await pause(page, 1600);

    await triggerRunAndWait(page, runCount);
    runCount = await getRunRowCount(page);
    await pause(page, 1800);

    // --- Set a performance budget ---
    const lcpRow = page.locator("tr", { hasText: "Largest Contentful Paint" });
    await lcpRow.scrollIntoViewIfNeeded();
    await pause(page, 500);
    const lcpThresholdInput = lcpRow.locator('input[name="threshold"]');
    await lcpThresholdInput.click();
    await lcpThresholdInput.fill(String(LCP_BUDGET_MS));
    await pause(page, 500);
    await lcpRow.locator('button:has-text("Save")').click();
    await pause(page, 1200);

    // Scroll up to show the new budget line sitting above two passing runs.
    await page.locator('button:has-text("Run now")').scrollIntoViewIfNeeded();
    await pause(page, 1800);

    // --- Simulate a deploy that shipped a heavier page, then run again ---
    const settingsUrlInput = page.locator('input[name="url"][type="url"]').last();
    await settingsUrlInput.scrollIntoViewIfNeeded();
    await pause(page, 500);
    await settingsUrlInput.click();
    await settingsUrlInput.fill("");
    await settingsUrlInput.pressSequentially(HEAVIER_URL, { delay: 15 });
    await pause(page, 500);
    await page.click('button:has-text("Save settings")');
    await pause(page, 1000);

    await page.locator('button:has-text("Run now")').scrollIntoViewIfNeeded();
    await pause(page, 500);
    await triggerRunAndWait(page, runCount, 60000);
    await pause(page, 800);

    // Show the breach: trend chart with the line crossing the budget, plus
    // the run history row with the regressed score and LCP.
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await pause(page, 2200);

    // --- Back to the project overview: the badge now reflects the regression ---
    await page.click(`a:has-text("${PROJECT_NAME}")`);
    await page.waitForURL(/\/dashboard\/[^/]+$/);
    await pause(page, 2500);
  } finally {
    await context.close();
    await browser.close();
  }

  const [recorded] = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  if (!recorded) throw new Error(`No video found in ${videoDir}`);
  if (existsSync(FINAL_VIDEO)) {
    renameSync(FINAL_VIDEO, `${FINAL_VIDEO}.bak`);
  }
  renameSync(path.join(videoDir, recorded), FINAL_VIDEO);
  console.log(`Recorded demo video: ${FINAL_VIDEO}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

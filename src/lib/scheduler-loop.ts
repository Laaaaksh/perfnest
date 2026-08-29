import cron from "node-cron";
import { prisma } from "./db";
import { pagesDue } from "./scheduler";
import { executeRun } from "./run-service";
import { sendMail } from "./mailer";

let started = false;

/**
 * Checks every minute for pages whose interval has elapsed and runs them one
 * at a time. Sequential on purpose: each run launches its own headless
 * Chrome, and a self-hosted box running this for free is not assumed to
 * have the memory to run several at once.
 */
export function startScheduler(): void {
  if (started) return;
  started = true;

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  cron.schedule("* * * * *", async () => {
    let due;
    try {
      const pages = await prisma.page.findMany({
        select: { id: true, intervalMinutes: true, lastRunAt: true },
      });
      due = pagesDue(pages, new Date());
    } catch (error) {
      console.error("[scheduler] failed to load pages:", error);
      return;
    }

    for (const page of due) {
      try {
        const result = await executeRun(prisma, {
          pageId: page.id,
          triggeredBy: "schedule",
          dashboardBaseUrl: baseUrl,
          alertDeps: { fetchImpl: fetch, sendMail },
        });
        if (result.status === "failed") {
          console.error(`[scheduler] run ${result.runId} for page ${page.id} failed: ${result.errorMessage}`);
        }
      } catch (error) {
        console.error(`[scheduler] unexpected error running page ${page.id}:`, error);
      }
    }
  });

  console.log("[scheduler] started - checking every minute for pages due a run");
}

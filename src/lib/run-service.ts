import type { PrismaClient, TriggerSource } from "@prisma/client";
import { evaluateBudgets } from "./budgets";
import { dispatchAlert, type AlertDeps } from "./alerts";
import { runLighthouse, type Device } from "./runner";

export interface ExecuteRunOptions {
  pageId: string;
  triggeredBy: TriggerSource;
  deployId?: string | null;
  dashboardBaseUrl: string;
  runLighthouseFn?: (url: string, device: Device) => ReturnType<typeof runLighthouse>;
  alertDeps: AlertDeps;
}

export interface ExecuteRunResult {
  runId: string;
  status: "success" | "failed";
  metrics: {
    performanceScore: number | null;
    lcp: number | null;
    cls: number | null;
    tbt: number | null;
    fcp: number | null;
    lighthouseVersion: string | null;
  } | null;
  budgetPassed: boolean;
  breaches: Array<{ metric: string; threshold: number; actual: number }>;
  errorMessage?: string;
}

/**
 * Runs Lighthouse against a page, persists the result, evaluates budgets,
 * and fires alerts for anything that breached - the one place all of
 * Perfnest's moving parts (runner, budgets, alerts, storage) meet. Used by
 * both the scheduler loop and the on-demand webhook/CI endpoint so both
 * paths behave identically.
 */
export async function executeRun(
  prisma: PrismaClient,
  options: ExecuteRunOptions
): Promise<ExecuteRunResult> {
  const page = await prisma.page.findUniqueOrThrow({
    where: { id: options.pageId },
    include: { budgets: true, project: { include: { alertChannels: true } } },
  });

  const run = await prisma.run.create({
    data: {
      pageId: page.id,
      triggeredBy: options.triggeredBy,
      deployId: options.deployId ?? null,
      status: "running",
    },
  });

  const runLighthouseFn = options.runLighthouseFn ?? runLighthouse;

  try {
    const metrics = await runLighthouseFn(page.url, page.device);

    await prisma.run.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        performanceScore: metrics.performanceScore,
        lcp: metrics.lcp,
        cls: metrics.cls,
        tbt: metrics.tbt,
        fcp: metrics.fcp,
        lighthouseVersion: metrics.lighthouseVersion,
      },
    });

    await prisma.page.update({
      where: { id: page.id },
      data: { lastRunAt: run.startedAt },
    });

    const breaches = evaluateBudgets(metrics, page.budgets);

    for (const breach of breaches) {
      const budget = page.budgets.find((b) => b.id === breach.budgetId);
      if (!budget) continue;

      const channels = page.project.alertChannels.filter((c) => c.enabled);

      for (const channel of channels) {
        const alert = await prisma.alert.create({
          data: {
            runId: run.id,
            budgetId: budget.id,
            channelId: channel.id,
            metric: breach.metric,
            thresholdValue: breach.threshold,
            actualValue: breach.actual,
          },
        });

        const delivered = await dispatchAlert(
          channel,
          {
            projectName: page.project.name,
            pageLabel: page.label,
            pageUrl: page.url,
            metric: breach.metric,
            threshold: breach.threshold,
            actual: breach.actual,
            deployId: options.deployId ?? null,
            dashboardUrl: `${options.dashboardBaseUrl}/dashboard/${page.projectId}`,
          },
          options.alertDeps
        );

        if (delivered) {
          await prisma.alert.update({
            where: { id: alert.id },
            data: { notifiedAt: new Date() },
          });
        }
      }

      if (channels.length === 0) {
        await prisma.alert.create({
          data: {
            runId: run.id,
            budgetId: budget.id,
            metric: breach.metric,
            thresholdValue: breach.threshold,
            actualValue: breach.actual,
          },
        });
      }
    }

    return {
      runId: run.id,
      status: "success",
      metrics,
      budgetPassed: breaches.length === 0,
      breaches: breaches.map((b) => ({ metric: b.metric, threshold: b.threshold, actual: b.actual })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), errorMessage },
    });

    return {
      runId: run.id,
      status: "failed",
      metrics: null,
      budgetPassed: false,
      breaches: [],
      errorMessage,
    };
  }
}

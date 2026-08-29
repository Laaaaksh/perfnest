/**
 * Exercises executeRun against a real Postgres database - the pure-logic
 * unit tests (budgets, alerts, scheduler, lighthouse-metrics) cover the
 * decision-making in isolation, but only a real Prisma round-trip catches a
 * broken query, a bad relation, or a field that silently never gets
 * persisted.
 *
 * Skipped automatically when DATABASE_URL isn't set (a contributor without
 * Docker running locally shouldn't see `make test` fail); CI always sets it.
 * See CONTRIBUTING.md for how to run these locally.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/db";
import { executeRun } from "../src/lib/run-service";
import type { RunResult } from "../src/lib/runner";

const RUN_INTEGRATION = Boolean(process.env.DATABASE_URL);

const createdProjectIds: string[] = [];

async function makeProject() {
  const project = await prisma.project.create({
    data: { name: "Integration test project", apiToken: `token-${crypto.randomUUID()}` },
  });
  createdProjectIds.push(project.id);
  return project;
}

const fakeMetrics: RunResult = {
  performanceScore: 95,
  lcp: 1800,
  cls: 0.02,
  tbt: 90,
  fcp: 900,
  lighthouseVersion: "12.3.0-test",
};

describe.skipIf(!RUN_INTEGRATION)("executeRun (integration)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.$disconnect();
  });

  it("persists a successful run's metrics and updates the page's lastRunAt", async () => {
    const project = await makeProject();
    const page = await prisma.page.create({
      data: { projectId: project.id, label: "Home", url: "https://example.com", device: "mobile" },
    });

    const result = await executeRun(prisma, {
      pageId: page.id,
      triggeredBy: "manual",
      dashboardBaseUrl: "https://perf.example.com",
      runLighthouseFn: async () => fakeMetrics,
      alertDeps: { fetchImpl: vi.fn(), sendMail: vi.fn() },
    });

    expect(result.status).toBe("success");
    expect(result.budgetPassed).toBe(true);
    expect(result.metrics).toEqual({
      performanceScore: 95,
      lcp: 1800,
      cls: 0.02,
      tbt: 90,
      fcp: 900,
      lighthouseVersion: "12.3.0-test",
    });

    const run = await prisma.run.findUniqueOrThrow({ where: { id: result.runId } });
    expect(run.status).toBe("success");
    expect(run.performanceScore).toBe(95);
    expect(run.lighthouseVersion).toBe("12.3.0-test");

    const updatedPage = await prisma.page.findUniqueOrThrow({ where: { id: page.id } });
    expect(updatedPage.lastRunAt).not.toBeNull();
  });

  it("creates and delivers an alert per enabled channel when a budget breaches", async () => {
    const project = await makeProject();
    const slackChannel = await prisma.alertChannel.create({
      data: { projectId: project.id, type: "slack", target: "https://hooks.slack.com/fake", enabled: true },
    });
    await prisma.alertChannel.create({
      data: { projectId: project.id, type: "webhook", target: "https://example.com/disabled", enabled: false },
    });
    const page = await prisma.page.create({
      data: {
        projectId: project.id,
        label: "Home",
        url: "https://example.com",
        device: "mobile",
        budgets: { create: [{ metric: "lcp", threshold: 1000, enabled: true }] },
      },
    });

    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    const result = await executeRun(prisma, {
      pageId: page.id,
      triggeredBy: "manual",
      dashboardBaseUrl: "https://perf.example.com",
      runLighthouseFn: async () => fakeMetrics, // lcp 1800 > 1000 threshold
      alertDeps: { fetchImpl, sendMail: vi.fn() },
    });

    expect(result.budgetPassed).toBe(false);
    expect(result.breaches).toEqual([{ metric: "lcp", threshold: 1000, actual: 1800 }]);

    // Only the enabled channel gets notified.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith("https://hooks.slack.com/fake", expect.anything());

    const alerts = await prisma.alert.findMany({ where: { runId: result.runId } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ channelId: slackChannel.id, actualValue: 1800, thresholdValue: 1000 });
    expect(alerts[0]?.notifiedAt).not.toBeNull();
  });

  it("still records a breach (with no notification) when the project has no alert channels", async () => {
    const project = await makeProject();
    const page = await prisma.page.create({
      data: {
        projectId: project.id,
        label: "Home",
        url: "https://example.com",
        device: "mobile",
        budgets: { create: [{ metric: "performance_score", threshold: 99, enabled: true }] },
      },
    });

    const result = await executeRun(prisma, {
      pageId: page.id,
      triggeredBy: "manual",
      dashboardBaseUrl: "https://perf.example.com",
      runLighthouseFn: async () => fakeMetrics, // score 95 < 99 threshold
      alertDeps: { fetchImpl: vi.fn(), sendMail: vi.fn() },
    });

    expect(result.budgetPassed).toBe(false);

    const alerts = await prisma.alert.findMany({ where: { runId: result.runId } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.channelId).toBeNull();
    expect(alerts[0]?.notifiedAt).toBeNull();
  });

  it("marks the run failed and leaves lastRunAt untouched when the Lighthouse run throws", async () => {
    const project = await makeProject();
    const page = await prisma.page.create({
      data: { projectId: project.id, label: "Home", url: "https://example.com", device: "mobile" },
    });

    const result = await executeRun(prisma, {
      pageId: page.id,
      triggeredBy: "manual",
      dashboardBaseUrl: "https://perf.example.com",
      runLighthouseFn: async () => {
        throw new Error("Chrome failed to launch");
      },
      alertDeps: { fetchImpl: vi.fn(), sendMail: vi.fn() },
    });

    expect(result.status).toBe("failed");
    expect(result.budgetPassed).toBe(false);
    expect(result.errorMessage).toContain("Chrome failed to launch");

    const run = await prisma.run.findUniqueOrThrow({ where: { id: result.runId } });
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toContain("Chrome failed to launch");

    const updatedPage = await prisma.page.findUniqueOrThrow({ where: { id: page.id } });
    expect(updatedPage.lastRunAt).toBeNull();
  });
});

/**
 * Populates a demo project with synthetic run history so the dashboard has
 * something to show without waiting days for real scheduled runs to
 * accumulate. The regression at run #30 mirrors the scenario in the
 * README's demo screenshot: a steady ~92 score, a sharp drop after a
 * deploy, and an LCP budget breach.
 *
 * Run with: npm run seed
 */
import { prisma } from "../src/lib/db";
import { evaluateBudgets } from "../src/lib/budgets";

async function main() {
  await prisma.project.deleteMany({ where: { name: "Demo" } });

  const project = await prisma.project.create({
    data: {
      name: "Demo",
      apiToken: "pfn_demo_token_do_not_use_in_production",
      publicEnabled: true,
      publicSlug: "demo",
      alertChannels: {
        create: [
          {
            type: "slack",
            target: "https://hooks.slack.com/services/T000/B000/EXAMPLEDONOTUSE",
            enabled: false,
          },
        ],
      },
    },
  });

  const page = await prisma.page.create({
    data: {
      projectId: project.id,
      label: "Homepage",
      url: "https://example.com",
      device: "mobile",
      intervalMinutes: 360,
      budgets: {
        create: [
          { metric: "performance_score", threshold: 90, enabled: true },
          { metric: "lcp", threshold: 2500, enabled: true },
        ],
      },
    },
    include: { budgets: true },
  });

  const runCount = 40;
  const regressionAt = 30;
  const now = Date.now();
  const stepMs = 6 * 60 * 60 * 1000;

  for (let i = 0; i < runCount; i += 1) {
    const startedAt = new Date(now - (runCount - i) * stepMs);
    const isRegression = i === regressionAt;
    const isRecovering = i > regressionAt;

    const noise = () => Math.random() * 4 - 2;
    let performanceScore = 92 + noise();
    let lcp = 1800 + Math.random() * 300;

    if (isRegression) {
      performanceScore = 61;
      lcp = 3900;
    } else if (isRecovering) {
      const recoveryProgress = Math.min(1, (i - regressionAt) / 6);
      performanceScore = 61 + (92 - 61) * recoveryProgress + noise();
      lcp = 3900 - (3900 - 1900) * recoveryProgress;
    }

    const metrics = {
      performanceScore: Math.round(performanceScore),
      lcp: Math.round(lcp),
      cls: Math.round((0.02 + Math.random() * 0.03) * 1000) / 1000,
      tbt: Math.round(80 + Math.random() * 120),
      fcp: Math.round(900 + Math.random() * 300),
    };

    const run = await prisma.run.create({
      data: {
        pageId: page.id,
        triggeredBy: isRegression ? "webhook" : "schedule",
        deployId: isRegression ? "a1b2c3d" : null,
        status: "success",
        startedAt,
        finishedAt: new Date(startedAt.getTime() + 15_000),
        lighthouseVersion: "12.3.0",
        ...metrics,
      },
    });

    const breaches = evaluateBudgets(metrics, page.budgets);
    for (const breach of breaches) {
      await prisma.alert.create({
        data: {
          runId: run.id,
          budgetId: breach.budgetId,
          metric: breach.metric,
          thresholdValue: breach.threshold,
          actualValue: breach.actual,
          notifiedAt: startedAt,
        },
      });
    }
  }

  await prisma.page.update({ where: { id: page.id }, data: { lastRunAt: new Date(now - stepMs) } });

  console.log(`Seeded demo project ${project.id} with ${runCount} runs.`);
  console.log(`Public dashboard: /p/${project.publicSlug}`);
  console.log(`Admin view: /dashboard/${project.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

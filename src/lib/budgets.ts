import type { BudgetMetric } from "@prisma/client";

export interface BudgetLike {
  id: string;
  metric: BudgetMetric;
  threshold: number;
  enabled: boolean;
}

export interface RunMetrics {
  performanceScore: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  fcp: number | null;
}

export interface BudgetBreach {
  budgetId: string;
  metric: BudgetMetric;
  threshold: number;
  actual: number;
}

/**
 * Every budget metric is a ceiling except performance_score, which is a floor
 * (a score below the threshold is the regression, not above it).
 */
function breaches(metric: BudgetMetric, actual: number, threshold: number): boolean {
  if (metric === "performance_score") {
    return actual < threshold;
  }
  return actual > threshold;
}

const METRIC_ACCESSOR: Record<BudgetMetric, (m: RunMetrics) => number | null> = {
  performance_score: (m) => m.performanceScore,
  lcp: (m) => m.lcp,
  cls: (m) => m.cls,
  tbt: (m) => m.tbt,
  fcp: (m) => m.fcp,
};

/**
 * Evaluates a run's metrics against a page's budgets. A budget with no
 * matching metric on the run (e.g. INP is null on a lab run with no
 * interaction trace) is silently skipped rather than treated as a breach -
 * missing data is not a regression.
 */
export function evaluateBudgets(metrics: RunMetrics, budgets: BudgetLike[]): BudgetBreach[] {
  const result: BudgetBreach[] = [];

  for (const budget of budgets) {
    if (!budget.enabled) continue;

    const actual = METRIC_ACCESSOR[budget.metric](metrics);
    if (actual === null || actual === undefined) continue;

    if (breaches(budget.metric, actual, budget.threshold)) {
      result.push({
        budgetId: budget.id,
        metric: budget.metric,
        threshold: budget.threshold,
        actual,
      });
    }
  }

  return result;
}

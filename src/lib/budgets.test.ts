import { describe, expect, it } from "vitest";
import { evaluateBudgets, type BudgetLike, type RunMetrics } from "./budgets";

const baseMetrics: RunMetrics = {
  performanceScore: 95,
  lcp: 1800,
  cls: 0.02,
  tbt: 100,
  fcp: 900,
};

function budget(overrides: Partial<BudgetLike>): BudgetLike {
  return { id: "b1", metric: "lcp", threshold: 2500, enabled: true, ...overrides };
}

describe("evaluateBudgets", () => {
  it("returns no breaches when every metric is within budget", () => {
    const breaches = evaluateBudgets(baseMetrics, [
      budget({ metric: "lcp", threshold: 2500 }),
      budget({ id: "b2", metric: "performance_score", threshold: 90 }),
    ]);
    expect(breaches).toEqual([]);
  });

  it("flags a ceiling metric (lcp) that exceeds its threshold", () => {
    const breaches = evaluateBudgets(
      { ...baseMetrics, lcp: 3200 },
      [budget({ metric: "lcp", threshold: 2500 })]
    );
    expect(breaches).toEqual([{ budgetId: "b1", metric: "lcp", threshold: 2500, actual: 3200 }]);
  });

  it("treats performance_score as a floor: below the threshold breaches, above does not", () => {
    const passing = evaluateBudgets(
      { ...baseMetrics, performanceScore: 92 },
      [budget({ id: "b2", metric: "performance_score", threshold: 90 })]
    );
    expect(passing).toEqual([]);

    const failing = evaluateBudgets(
      { ...baseMetrics, performanceScore: 61 },
      [budget({ id: "b2", metric: "performance_score", threshold: 90 })]
    );
    expect(failing).toEqual([{ budgetId: "b2", metric: "performance_score", threshold: 90, actual: 61 }]);
  });

  it("a value exactly at the threshold does not breach", () => {
    const breaches = evaluateBudgets(
      { ...baseMetrics, lcp: 2500 },
      [budget({ metric: "lcp", threshold: 2500 })]
    );
    expect(breaches).toEqual([]);
  });

  it("skips disabled budgets even when the metric is over the threshold", () => {
    const breaches = evaluateBudgets(
      { ...baseMetrics, lcp: 5000 },
      [budget({ metric: "lcp", threshold: 2500, enabled: false })]
    );
    expect(breaches).toEqual([]);
  });

  it("skips a budget whose metric is null on the run instead of treating missing data as a breach", () => {
    const breaches = evaluateBudgets(
      { ...baseMetrics, cls: null },
      [budget({ id: "b3", metric: "cls", threshold: 0.1 })]
    );
    expect(breaches).toEqual([]);
  });

  it("reports multiple simultaneous breaches", () => {
    const breaches = evaluateBudgets(
      { performanceScore: 40, lcp: 6000, cls: 0.5, tbt: 900, fcp: 3000 },
      [
        budget({ id: "b1", metric: "lcp", threshold: 2500 }),
        budget({ id: "b2", metric: "cls", threshold: 0.1 }),
        budget({ id: "b3", metric: "performance_score", threshold: 90 }),
      ]
    );
    expect(breaches.map((b) => b.metric).sort()).toEqual(["cls", "lcp", "performance_score"]);
  });
});

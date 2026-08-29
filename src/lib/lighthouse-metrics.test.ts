import { describe, expect, it } from "vitest";
import { extractMetrics, type LighthouseResultLike } from "./lighthouse-metrics";

function fixture(overrides: Partial<LighthouseResultLike> = {}): LighthouseResultLike {
  return {
    lighthouseVersion: "12.3.0",
    categories: { performance: { score: 0.92 } },
    audits: {
      "largest-contentful-paint": { numericValue: 1823.4 },
      "cumulative-layout-shift": { numericValue: 0.021 },
      "total-blocking-time": { numericValue: 112.5 },
      "first-contentful-paint": { numericValue: 950.1 },
    },
    ...overrides,
  };
}

describe("extractMetrics", () => {
  it("converts the 0-1 performance score to a 0-100 integer", () => {
    const result = extractMetrics(fixture());
    expect(result.performanceScore).toBe(92);
  });

  it("pulls numericValue straight through for timing/shift audits", () => {
    const result = extractMetrics(fixture());
    expect(result.lcp).toBe(1823.4);
    expect(result.cls).toBe(0.021);
    expect(result.tbt).toBe(112.5);
    expect(result.fcp).toBe(950.1);
    expect(result.lighthouseVersion).toBe("12.3.0");
  });

  it("returns null metrics rather than throwing when the LHR is missing categories/audits", () => {
    const result = extractMetrics({});
    expect(result).toEqual({
      performanceScore: null,
      lcp: null,
      cls: null,
      tbt: null,
      fcp: null,
      lighthouseVersion: null,
    });
  });

  it("returns null for an audit present but missing a numericValue (e.g. audit errored)", () => {
    const result = extractMetrics(
      fixture({ audits: { "largest-contentful-paint": { score: null } } })
    );
    expect(result.lcp).toBeNull();
  });

  it("returns null rather than NaN for a non-numeric numericValue", () => {
    const result = extractMetrics(
      fixture({ audits: { "largest-contentful-paint": { numericValue: NaN } } })
    );
    expect(result.lcp).toBeNull();
  });
});

export interface ExtractedMetrics {
  performanceScore: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  fcp: number | null;
  lighthouseVersion: string | null;
}

interface LighthouseAudit {
  numericValue?: number;
  score?: number | null;
}

/**
 * Minimal shape of a Lighthouse Result (LHR) this extractor depends on.
 * Deliberately narrow rather than importing Lighthouse's own (huge,
 * partially-`any`) type so the pure extraction logic stays easy to unit test
 * against small fixtures.
 */
export interface LighthouseResultLike {
  lighthouseVersion?: string;
  categories?: {
    performance?: { score: number | null };
  };
  audits?: Record<string, LighthouseAudit | undefined>;
}

function numeric(audit: LighthouseAudit | undefined): number | null {
  if (!audit || typeof audit.numericValue !== "number" || Number.isNaN(audit.numericValue)) {
    return null;
  }
  return audit.numericValue;
}

/**
 * Pulls the metrics Perfnest tracks out of a raw Lighthouse Result. The
 * performance category score arrives as 0-1 in the LHR; Perfnest stores and
 * displays it as 0-100, matching what every Lighthouse report and the paid
 * incumbents (Calibre, SpeedCurve) show.
 */
export function extractMetrics(lhr: LighthouseResultLike): ExtractedMetrics {
  const rawScore = lhr.categories?.performance?.score;

  return {
    performanceScore: typeof rawScore === "number" ? Math.round(rawScore * 100) : null,
    lcp: numeric(lhr.audits?.["largest-contentful-paint"]),
    cls: numeric(lhr.audits?.["cumulative-layout-shift"]),
    tbt: numeric(lhr.audits?.["total-blocking-time"]),
    fcp: numeric(lhr.audits?.["first-contentful-paint"]),
    lighthouseVersion: lhr.lighthouseVersion ?? null,
  };
}

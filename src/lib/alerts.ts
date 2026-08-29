import type { BudgetMetric } from "@prisma/client";

export interface AlertChannelLike {
  id: string;
  type: "slack" | "webhook" | "email";
  target: string;
  enabled: boolean;
}

export interface BreachNotification {
  projectName: string;
  pageLabel: string;
  pageUrl: string;
  metric: BudgetMetric;
  threshold: number;
  actual: number;
  deployId: string | null;
  dashboardUrl: string;
}

const METRIC_LABEL: Record<BudgetMetric, string> = {
  performance_score: "Performance score",
  lcp: "LCP",
  cls: "CLS",
  tbt: "TBT",
  fcp: "FCP",
};

function formatMetricValue(metric: BudgetMetric, value: number): string {
  if (metric === "performance_score") return `${Math.round(value)}`;
  if (metric === "cls") return value.toFixed(3);
  return `${Math.round(value)}ms`;
}

export interface BreachMessage {
  subject: string;
  text: string;
}

export function buildBreachMessage(n: BreachNotification): BreachMessage {
  const label = METRIC_LABEL[n.metric];
  const actual = formatMetricValue(n.metric, n.actual);
  const threshold = formatMetricValue(n.metric, n.threshold);
  const comparator = n.metric === "performance_score" ? "below" : "above";
  const deploySuffix = n.deployId ? ` after deploy ${n.deployId}` : "";

  return {
    subject: `Perfnest: ${n.pageLabel} ${label} budget exceeded`,
    text:
      `⚠️ ${n.projectName} — ${n.pageLabel} (${n.pageUrl}): ${label} budget exceeded ` +
      `(${actual} ${comparator} ${threshold} budget)${deploySuffix}. ${n.dashboardUrl}`,
  };
}

export interface AlertDeps {
  fetchImpl: typeof fetch;
  sendMail: (to: string, subject: string, text: string) => Promise<void>;
}

/**
 * Sends one breach notification down one channel. Returns false (never
 * throws) on delivery failure so one broken channel doesn't stop the others
 * from being notified for the same breach - the caller logs the failure.
 */
export async function dispatchAlert(
  channel: AlertChannelLike,
  notification: BreachNotification,
  deps: AlertDeps
): Promise<boolean> {
  if (!channel.enabled) return false;

  const message = buildBreachMessage(notification);

  try {
    if (channel.type === "slack") {
      const res = await deps.fetchImpl(channel.target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: message.text }),
      });
      return res.ok;
    }

    if (channel.type === "webhook") {
      const res = await deps.fetchImpl(channel.target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: notification.projectName,
          page: notification.pageLabel,
          url: notification.pageUrl,
          metric: notification.metric,
          threshold: notification.threshold,
          actual: notification.actual,
          deployId: notification.deployId,
          dashboardUrl: notification.dashboardUrl,
          message: message.text,
        }),
      });
      return res.ok;
    }

    if (channel.type === "email") {
      await deps.sendMail(channel.target, message.subject, message.text);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

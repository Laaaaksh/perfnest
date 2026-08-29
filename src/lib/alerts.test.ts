import { describe, expect, it, vi } from "vitest";
import { buildBreachMessage, dispatchAlert, type AlertChannelLike, type BreachNotification } from "./alerts";

const notification: BreachNotification = {
  projectName: "example.com",
  pageLabel: "Homepage",
  pageUrl: "https://example.com",
  metric: "lcp",
  threshold: 2500,
  actual: 3800,
  deployId: "abc123",
  dashboardUrl: "https://perf.example.com/dashboard/proj1",
};

describe("buildBreachMessage", () => {
  it("formats a ceiling metric as 'above' with millisecond units", () => {
    const message = buildBreachMessage(notification);
    expect(message.text).toContain("LCP budget exceeded");
    expect(message.text).toContain("3800ms above 2500ms budget");
    expect(message.text).toContain("after deploy abc123");
    expect(message.text).toContain(notification.dashboardUrl);
  });

  it("formats performance_score as 'below' with no unit suffix", () => {
    const message = buildBreachMessage({ ...notification, metric: "performance_score", actual: 61, threshold: 90 });
    expect(message.text).toContain("61 below 90 budget");
  });

  it("formats cls to three decimal places", () => {
    const message = buildBreachMessage({ ...notification, metric: "cls", actual: 0.34, threshold: 0.1 });
    expect(message.text).toContain("0.340 above 0.100 budget");
  });

  it("omits the deploy clause when no deployId is present", () => {
    const message = buildBreachMessage({ ...notification, deployId: null });
    expect(message.text).not.toContain("after deploy");
  });
});

describe("dispatchAlert", () => {
  function slackChannel(overrides: Partial<AlertChannelLike> = {}): AlertChannelLike {
    return { id: "c1", type: "slack", target: "https://hooks.slack.com/x", enabled: true, ...overrides };
  }

  it("posts a Slack payload and returns true on a 2xx response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const sendMail = vi.fn();

    const delivered = await dispatchAlert(slackChannel(), notification, { fetchImpl, sendMail });

    expect(delivered).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://hooks.slack.com/x",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.text).toContain("LCP budget exceeded");
  });

  it("returns false without throwing when the webhook responds with a non-2xx status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const sendMail = vi.fn();

    const delivered = await dispatchAlert(slackChannel(), notification, { fetchImpl, sendMail });
    expect(delivered).toBe(false);
  });

  it("returns false without throwing when the network request rejects", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const sendMail = vi.fn();

    const delivered = await dispatchAlert(slackChannel(), notification, { fetchImpl, sendMail });
    expect(delivered).toBe(false);
  });

  it("sends a full structured payload for the generic webhook type", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const sendMail = vi.fn();

    await dispatchAlert(slackChannel({ type: "webhook", target: "https://example.com/hook" }), notification, {
      fetchImpl,
      sendMail,
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body).toMatchObject({
      project: "example.com",
      page: "Homepage",
      metric: "lcp",
      threshold: 2500,
      actual: 3800,
      deployId: "abc123",
    });
  });

  it("delivers via the injected mailer for the email type", async () => {
    const fetchImpl = vi.fn();
    const sendMail = vi.fn().mockResolvedValue(undefined);

    const delivered = await dispatchAlert(slackChannel({ type: "email", target: "on-call@example.com" }), notification, {
      fetchImpl,
      sendMail,
    });

    expect(delivered).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(
      "on-call@example.com",
      expect.stringContaining("Homepage"),
      expect.stringContaining("LCP budget exceeded")
    );
  });

  it("returns false when the mailer throws (e.g. SMTP not configured)", async () => {
    const fetchImpl = vi.fn();
    const sendMail = vi.fn().mockRejectedValue(new Error("SMTP_HOST is not set"));

    const delivered = await dispatchAlert(slackChannel({ type: "email", target: "on-call@example.com" }), notification, {
      fetchImpl,
      sendMail,
    });
    expect(delivered).toBe(false);
  });

  it("does nothing and returns false for a disabled channel", async () => {
    const fetchImpl = vi.fn();
    const sendMail = vi.fn();

    const delivered = await dispatchAlert(slackChannel({ enabled: false }), notification, { fetchImpl, sendMail });

    expect(delivered).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

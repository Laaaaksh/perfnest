import { describe, expect, it } from "vitest";
import { isPageDue, pagesDue, type SchedulablePage } from "./scheduler";

const NOW = new Date("2026-08-29T12:00:00Z");

describe("isPageDue", () => {
  it("is due when it has never run", () => {
    const page: SchedulablePage = { id: "p1", intervalMinutes: 60, lastRunAt: null };
    expect(isPageDue(page, NOW)).toBe(true);
  });

  it("is not due when the interval has not yet elapsed", () => {
    const page: SchedulablePage = {
      id: "p1",
      intervalMinutes: 60,
      lastRunAt: new Date("2026-08-29T11:30:00Z"),
    };
    expect(isPageDue(page, NOW)).toBe(false);
  });

  it("is due exactly when the interval has elapsed", () => {
    const page: SchedulablePage = {
      id: "p1",
      intervalMinutes: 60,
      lastRunAt: new Date("2026-08-29T11:00:00Z"),
    };
    expect(isPageDue(page, NOW)).toBe(true);
  });

  it("is due when well past the interval", () => {
    const page: SchedulablePage = {
      id: "p1",
      intervalMinutes: 60,
      lastRunAt: new Date("2026-08-29T09:00:00Z"),
    };
    expect(isPageDue(page, NOW)).toBe(true);
  });
});

describe("pagesDue", () => {
  it("filters a mixed list down to only the due pages", () => {
    const pages: SchedulablePage[] = [
      { id: "due-never-run", intervalMinutes: 60, lastRunAt: null },
      { id: "not-due", intervalMinutes: 60, lastRunAt: new Date("2026-08-29T11:45:00Z") },
      { id: "due-elapsed", intervalMinutes: 60, lastRunAt: new Date("2026-08-29T10:00:00Z") },
    ];
    expect(pagesDue(pages, NOW).map((p) => p.id)).toEqual(["due-never-run", "due-elapsed"]);
  });
});

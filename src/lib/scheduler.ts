export interface SchedulablePage {
  id: string;
  intervalMinutes: number;
  lastRunAt: Date | null;
}

/**
 * A page is due when it has never run, or when its interval has elapsed
 * since the last run started. Runs are triggered by start time, not finish
 * time, so a slow Lighthouse run doesn't cause its own page to immediately
 * re-queue the moment it finishes.
 */
export function isPageDue(page: SchedulablePage, now: Date): boolean {
  if (!page.lastRunAt) return true;

  const dueAt = page.lastRunAt.getTime() + page.intervalMinutes * 60_000;
  return now.getTime() >= dueAt;
}

export function pagesDue<T extends SchedulablePage>(pages: T[], now: Date): T[] {
  return pages.filter((page) => isPageDue(page, now));
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  deletePageAction,
  triggerRunAction,
  updatePageAction,
  upsertBudgetAction,
  deleteBudgetAction,
} from "@/lib/actions";
import type { BudgetMetric } from "@prisma/client";

export const dynamic = "force-dynamic";

const METRICS: { key: BudgetMetric; label: string; unit: string; runField: string }[] = [
  { key: "performance_score", label: "Performance score", unit: "0-100", runField: "performanceScore" },
  { key: "lcp", label: "Largest Contentful Paint", unit: "ms", runField: "lcp" },
  { key: "tbt", label: "Total Blocking Time", unit: "ms (INP lab proxy)", runField: "tbt" },
  { key: "cls", label: "Cumulative Layout Shift", unit: "unitless", runField: "cls" },
  { key: "fcp", label: "First Contentful Paint", unit: "ms", runField: "fcp" },
];

function fmt(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export default async function PageDetail({
  params,
}: {
  params: Promise<{ projectId: string; pageId: string }>;
}) {
  const { projectId, pageId } = await params;

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      project: true,
      budgets: true,
      runs: { orderBy: { startedAt: "desc" }, take: 100 },
    },
  });

  if (!page || page.projectId !== projectId) notFound();

  const chronological = [...page.runs].reverse();
  const budgetByMetric = new Map(page.budgets.map((b) => [b.metric, b]));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav
        breadcrumb={[
          { label: page.project.name, href: `/dashboard/${projectId}` },
          { label: page.label },
        ]}
      />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{page.label}</h1>
            <a href={page.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--text-dim)] hover:text-[var(--accent)]">
              {page.url}
            </a>
          </div>
          <div className="flex gap-2">
            <form action={triggerRunAction}>
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <button
                type="submit"
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#06281c] hover:opacity-90"
              >
                Run now
              </button>
            </form>
          </div>
        </div>

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {METRICS.map((metric) => {
            const budget = budgetByMetric.get(metric.key);
            const data: TrendPoint[] = chronological.map((run) => ({
              date: fmt(run.startedAt),
              value: (run as unknown as Record<string, number | null>)[metric.runField] ?? null,
            }));
            return (
              <TrendChart
                key={metric.key}
                label={metric.label}
                unit={metric.unit}
                data={data}
                budget={budget?.enabled ? budget.threshold : null}
              />
            );
          })}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Budgets</h2>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-xs uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2">Metric</th>
                  <th className="px-4 py-2">Threshold</th>
                  <th className="px-4 py-2">Enabled</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const budget = budgetByMetric.get(metric.key);
                  return (
                    <tr key={metric.key} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2">{metric.label}</td>
                      <td colSpan={3} className="px-4 py-2">
                        <form action={upsertBudgetAction} className="flex items-center gap-3">
                          <input type="hidden" name="pageId" value={page.id} />
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="metric" value={metric.key} />
                          <input
                            type="number"
                            step="any"
                            name="threshold"
                            defaultValue={budget?.threshold}
                            placeholder="no budget set"
                            className="w-32 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 outline-none focus:border-[var(--accent)]"
                          />
                          <label className="flex items-center gap-1 text-xs text-[var(--text-dim)]">
                            <input type="checkbox" name="enabled" value="true" defaultChecked={budget?.enabled ?? true} />
                            enabled
                          </label>
                          <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1 text-xs hover:border-[var(--accent)]/50">
                            Save
                          </button>
                        </form>
                        {budget ? (
                          <form action={deleteBudgetAction} className="mt-1">
                            <input type="hidden" name="budgetId" value={budget.id} />
                            <input type="hidden" name="pageId" value={page.id} />
                            <input type="hidden" name="projectId" value={projectId} />
                            <button type="submit" className="text-xs text-[var(--bad)] hover:opacity-80">
                              Remove budget
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Run history</h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-xs uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Trigger</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">LCP</th>
                  <th className="px-4 py-2">TBT</th>
                  <th className="px-4 py-2">CLS</th>
                  <th className="px-4 py-2">Deploy</th>
                </tr>
              </thead>
              <tbody>
                {page.runs.map((run) => (
                  <tr key={run.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2">{fmt(run.startedAt)}</td>
                    <td className="px-4 py-2 text-[var(--text-dim)]">{run.triggeredBy}</td>
                    <td className="px-4 py-2">
                      <span className={run.status === "success" ? "text-[var(--good)]" : run.status === "failed" ? "text-[var(--bad)]" : "text-[var(--text-dim)]"}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{run.performanceScore ?? "—"}</td>
                    <td className="px-4 py-2">{run.lcp != null ? `${Math.round(run.lcp)}ms` : "—"}</td>
                    <td className="px-4 py-2">{run.tbt != null ? `${Math.round(run.tbt)}ms` : "—"}</td>
                    <td className="px-4 py-2">{run.cls?.toFixed(3) ?? "—"}</td>
                    <td className="px-4 py-2 text-[var(--text-dim)]">{run.deployId ?? "—"}</td>
                  </tr>
                ))}
                {page.runs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[var(--text-dim)]">
                      No runs yet. Click &ldquo;Run now&rdquo; above, or wait for the scheduler.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Settings</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <form action={updatePageAction} className="mb-4 grid grid-cols-2 gap-3">
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input
                type="text"
                name="label"
                defaultValue={page.label}
                required
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                type="url"
                name="url"
                defaultValue={page.url}
                required
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <select
                name="device"
                defaultValue={page.device}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="mobile">Mobile (Slow 4G, 4x CPU)</option>
                <option value="desktop">Desktop (Dense 4G, no throttle)</option>
              </select>
              <input
                type="number"
                name="intervalMinutes"
                defaultValue={page.intervalMinutes}
                min={15}
                step={15}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="col-span-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]/50"
              >
                Save settings
              </button>
            </form>

            <form action={deletePageAction}>
              <input type="hidden" name="pageId" value={page.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <ConfirmButton
                message={`Delete "${page.label}" and its entire run history? This cannot be undone.`}
                className="text-sm text-[var(--bad)] hover:opacity-80"
              >
                Delete page
              </ConfirmButton>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

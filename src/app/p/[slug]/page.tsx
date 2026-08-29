import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ScoreBadge } from "@/components/ScoreBadge";
import { TrendChart, type TrendPoint } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

function fmt(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export default async function PublicDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const project = await prisma.project.findFirst({
    where: { publicSlug: slug, publicEnabled: true },
    include: {
      pages: {
        orderBy: { createdAt: "asc" },
        include: { runs: { orderBy: { startedAt: "desc" }, take: 100 } },
      },
    },
  });

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15" stroke="#6ee7b7" strokeWidth="2" />
            <path d="M9 20 L14 12 L18 17 L23 9" stroke="#6ee7b7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold">{project.name}</span>
          <span className="text-sm text-[var(--text-dim)]">— performance trends, powered by perfnest</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        {project.pages.map((page) => {
          const chronological = [...page.runs].reverse();
          const scoreData: TrendPoint[] = chronological.map((run) => ({
            date: fmt(run.startedAt),
            value: run.performanceScore,
          }));
          const lcpData: TrendPoint[] = chronological.map((run) => ({
            date: fmt(run.startedAt),
            value: run.lcp,
          }));
          const latest = page.runs[0];

          return (
            <div key={page.id} className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">{page.label}</h2>
                  <span className="text-xs text-[var(--text-dim)]">{page.url}</span>
                </div>
                <ScoreBadge score={latest?.performanceScore ?? null} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TrendChart label="Performance score" unit="0-100" data={scoreData} />
                <TrendChart label="Largest Contentful Paint" unit="ms" data={lcpData} />
              </div>
            </div>
          );
        })}
        {project.pages.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">No pages are being monitored in this project yet.</p>
        ) : null}
      </main>
    </div>
  );
}

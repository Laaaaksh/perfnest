import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  createAlertChannelAction,
  createPageAction,
  deleteAlertChannelAction,
  deleteProjectAction,
  rotateApiTokenAction,
  togglePublicAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pages: {
        orderBy: { createdAt: "asc" },
        include: { runs: { orderBy: { startedAt: "desc" }, take: 1 } },
      },
      alertChannels: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) notFound();

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav breadcrumb={[{ label: project.name }]} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <form action={deleteProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <ConfirmButton
              message={`Delete "${project.name}" and all its pages, runs, and history? This cannot be undone.`}
              className="text-sm text-[var(--bad)] hover:opacity-80"
            >
              Delete project
            </ConfirmButton>
          </form>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Pages</h2>

          {project.pages.length === 0 ? (
            <p className="mb-4 text-sm text-[var(--text-dim)]">No pages yet - add one below to start monitoring it.</p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {project.pages.map((page) => {
                const latest = page.runs[0];
                return (
                  <li key={page.id}>
                    <Link
                      href={`/dashboard/${project.id}/pages/${page.id}`}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--accent)]/50"
                    >
                      <div>
                        <div className="font-medium">{page.label}</div>
                        <div className="text-xs text-[var(--text-dim)]">
                          {page.url} · {page.device} · every {page.intervalMinutes}m
                        </div>
                      </div>
                      <ScoreBadge score={latest?.performanceScore ?? null} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="mb-3 text-sm font-medium">Add a page</h3>
            <form action={createPageAction} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <input
                type="text"
                name="label"
                placeholder="Label (e.g. Homepage)"
                required
                className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] sm:col-span-1"
              />
              <input
                type="url"
                name="url"
                placeholder="https://example.com"
                required
                className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] sm:col-span-1"
              />
              <select
                name="device"
                defaultValue="mobile"
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="mobile">Mobile (Slow 4G, 4x CPU)</option>
                <option value="desktop">Desktop (Dense 4G, no throttle)</option>
              </select>
              <input
                type="number"
                name="intervalMinutes"
                defaultValue={360}
                min={15}
                step={15}
                title="Check interval in minutes"
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="col-span-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#06281c] hover:opacity-90"
              >
                Add page
              </button>
            </form>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Alert channels</h2>
          {project.alertChannels.length > 0 ? (
            <ul className="mb-4 flex flex-col gap-2">
              {project.alertChannels.map((channel) => (
                <li
                  key={channel.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="text-sm">
                    <span className="mr-2 rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs uppercase text-[var(--text-dim)]">
                      {channel.type}
                    </span>
                    {channel.target}
                  </div>
                  <form action={deleteAlertChannelAction}>
                    <input type="hidden" name="channelId" value={channel.id} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <button type="submit" className="text-xs text-[var(--bad)] hover:opacity-80">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-[var(--text-dim)]">
              No alert channels yet. Budget breaches are still recorded, but nothing is notified until you add one.
            </p>
          )}

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="mb-3 text-sm font-medium">Add a channel</h3>
            <form action={createAlertChannelAction} className="grid grid-cols-3 gap-3">
              <input type="hidden" name="projectId" value={project.id} />
              <select
                name="type"
                defaultValue="slack"
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="slack">Slack webhook</option>
                <option value="webhook">Generic webhook</option>
                <option value="email">Email</option>
              </select>
              <input
                type="text"
                name="target"
                placeholder="https://hooks.slack.com/... or you@example.com"
                required
                className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                className="col-span-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#06281c] hover:opacity-90"
              >
                Add channel
              </button>
            </form>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">Public dashboard</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-sm text-[var(--text-dim)]">
              A public dashboard is a read-only, unauthenticated page showing this project&apos;s trends - useful for
              sharing status externally, the way a status page does for uptime.
            </p>
            {project.publicEnabled && project.publicSlug ? (
              <p className="mb-3 text-sm">
                Live at{" "}
                <Link href={`/p/${project.publicSlug}`} className="text-[var(--accent)] underline">
                  {baseUrl}/p/{project.publicSlug}
                </Link>
              </p>
            ) : null}
            <form action={togglePublicAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="enabled" value={(!project.publicEnabled).toString()} />
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]/50"
              >
                {project.publicEnabled ? "Disable public dashboard" : "Enable public dashboard"}
              </button>
            </form>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-[var(--text-dim)]">CI / webhook trigger</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-sm text-[var(--text-dim)]">
              Trigger an on-demand run from a deploy pipeline with this project&apos;s API token
              (see the README&apos;s CI integration section for a ready-to-paste GitHub Actions
              step).
            </p>
            <pre className="mb-3 overflow-x-auto rounded-md bg-[var(--surface-2)] p-3 text-xs">
              {`curl -sf -X POST ${baseUrl}/api/pages/<pageId>/runs \\
  -H "Authorization: Bearer ${project.apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"deployId": "'"$GITHUB_SHA"'"}'`}
            </pre>
            <form action={rotateApiTokenAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <ConfirmButton
                message="Rotate this project's API token? Any CI pipeline using the old token will start failing until it's updated."
                className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                Rotate token
              </ConfirmButton>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

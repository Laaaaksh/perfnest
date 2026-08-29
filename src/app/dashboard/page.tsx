import Link from "next/link";
import { prisma } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { createProjectAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { pages: { select: { id: true } } },
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
        </div>

        {projects.length === 0 ? (
          <p className="mb-8 text-sm text-[var(--text-dim)]">
            No projects yet. A project groups the pages you want to watch - create one to get started.
          </p>
        ) : (
          <ul className="mb-10 flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/${project.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--accent)]/50"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="text-sm text-[var(--text-dim)]">
                    {project.pages.length} page{project.pages.length === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-sm font-medium">New project</h2>
          <form action={createProjectAction} className="flex gap-2">
            <input
              type="text"
              name="name"
              placeholder="e.g. Marketing site"
              required
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#06281c] hover:opacity-90">
              Create
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

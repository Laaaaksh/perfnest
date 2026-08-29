import { loginAction } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-6 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15" stroke="#6ee7b7" strokeWidth="2" />
            <path d="M9 20 L14 12 L18 17 L23 9" stroke="#6ee7b7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">perfnest</span>
        </div>

        <h1 className="mb-1 text-xl font-semibold text-[var(--text)]">Sign in</h1>
        <p className="mb-6 text-sm text-[var(--text-dim)]">Enter the admin password configured for this instance.</p>

        {error ? (
          <p className="mb-4 rounded-md border border-[var(--bad)]/30 bg-[var(--bad)]/10 px-3 py-2 text-sm text-[var(--bad)]">
            Incorrect password.
          </p>
        ) : null}

        <form action={loginAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <input
            type="password"
            name="password"
            placeholder="Admin password"
            required
            autoFocus
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#06281c] transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

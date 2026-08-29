import Link from "next/link";
import { logoutAction } from "@/lib/actions";

export function TopNav({ breadcrumb }: { breadcrumb?: { label: string; href?: string }[] }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15" stroke="#6ee7b7" strokeWidth="2" />
            <path d="M9 20 L14 12 L18 17 L23 9" stroke="#6ee7b7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          perfnest
        </Link>
        {breadcrumb?.map((crumb) => (
          <span key={crumb.label} className="flex items-center gap-3 text-[var(--text-dim)]">
            <span>/</span>
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-[var(--text)]">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[var(--text)]">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>
      <form action={logoutAction}>
        <button type="submit" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          Sign out
        </button>
      </form>
    </header>
  );
}

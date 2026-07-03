import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function DashboardShell({
  roleLabel,
  userName,
  nav,
  children,
}: {
  roleLabel: string;
  userName: string;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold text-slate-900">
              Stat Workforce
            </Link>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{userName}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {nav && <div className="mx-auto max-w-6xl px-6 pb-3">{nav}</div>}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

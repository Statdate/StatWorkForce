import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getMessageThreads } from "@/lib/data/messages";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";

export default async function WorkerMessagesPage() {
  const [user, threads] = await Promise.all([getCurrentUser(), getMessageThreads()]);

  const nav = <WorkerNav active="/worker/messages" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">Private messages with your unit&apos;s manager.</p>

      <div className="mt-6 space-y-2">
        {threads.map((manager) => (
          <Link
            key={manager.id}
            href={`/worker/messages/${manager.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <span className="font-medium text-slate-900">
              {manager.firstName} {manager.lastName}
            </span>
            {manager.unreadCount > 0 && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                {manager.unreadCount} new
              </span>
            )}
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-slate-500">No manager assigned to your unit yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

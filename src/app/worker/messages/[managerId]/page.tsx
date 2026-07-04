import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getConversation, getMessageThreads } from "@/lib/data/messages";
import { DashboardShell } from "@/components/dashboard-shell";
import { MessageThread } from "@/components/message-thread";
import { WorkerNav } from "@/components/worker-nav";
import { ActionErrorBanner } from "@/components/action-error-banner";

export default async function WorkerMessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ managerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { managerId } = await params;

  const [user, threads, messages, { error }] = await Promise.all([
    getCurrentUser(),
    getMessageThreads(),
    getConversation(managerId),
    searchParams,
  ]);

  const activeManager = threads.find((m) => m.id === managerId);
  if (!activeManager) notFound();

  const nav = <WorkerNav active="/worker/messages" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <div className="mb-4">
        <Link href="/worker/messages" className="text-sm text-slate-500 hover:text-slate-900">
          ← All conversations
        </Link>
      </div>
      <ActionErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          {threads.map((manager) => (
            <Link
              key={manager.id}
              href={`/worker/messages/${manager.id}`}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                manager.id === managerId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span>
                {manager.firstName} {manager.lastName}
              </span>
              {manager.unreadCount > 0 && manager.id !== managerId && (
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {manager.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <MessageThread
          messages={messages}
          currentUserId={user.id}
          recipientId={managerId}
          recipientName={`${activeManager.firstName} ${activeManager.lastName}`}
          returnPath={`/worker/messages/${managerId}`}
        />
      </div>
    </DashboardShell>
  );
}

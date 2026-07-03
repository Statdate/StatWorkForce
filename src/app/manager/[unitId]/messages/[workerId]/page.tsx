import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getManagerUnits } from "@/lib/data/manager";
import { getConversation, getUnitMessageThreads } from "@/lib/data/messages";
import { DashboardShell } from "@/components/dashboard-shell";
import { MessageThread } from "@/components/message-thread";

export default async function ManagerMessageThreadPage({
  params,
}: {
  params: Promise<{ unitId: string; workerId: string }>;
}) {
  const { unitId, workerId } = await params;
  const units = await getManagerUnits();
  const activeUnit = units.find((u) => u.id === unitId);
  if (!activeUnit) notFound();

  const [user, threads, messages] = await Promise.all([
    getCurrentUser(),
    getUnitMessageThreads(unitId),
    getConversation(workerId),
  ]);

  const activeWorker = threads.find((w) => w.id === workerId);
  if (!activeWorker) notFound();

  return (
    <DashboardShell roleLabel="Manager" userName={`${user.firstName} ${user.lastName}`}>
      <div className="mb-4">
        <Link href={`/manager/${unitId}/messages`} className="text-sm text-slate-500 hover:text-slate-900">
          ← All conversations
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          {threads.map((worker) => (
            <Link
              key={worker.id}
              href={`/manager/${unitId}/messages/${worker.id}`}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                worker.id === workerId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span>
                {worker.firstName} {worker.lastName}
              </span>
              {worker.unreadCount > 0 && worker.id !== workerId && (
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {worker.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <MessageThread
          messages={messages}
          currentUserId={user.id}
          recipientId={workerId}
          recipientName={`${activeWorker.firstName} ${activeWorker.lastName}`}
          returnPath={`/manager/${unitId}/messages/${workerId}`}
        />
      </div>
    </DashboardShell>
  );
}

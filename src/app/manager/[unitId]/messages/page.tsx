import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getManagerUnits } from "@/lib/data/manager";
import { getUnitMessageThreads } from "@/lib/data/messages";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function ManagerMessagesPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const units = await getManagerUnits();
  const activeUnit = units.find((u) => u.id === unitId);
  if (!activeUnit) notFound();

  const [user, threads] = await Promise.all([getCurrentUser(), getUnitMessageThreads(unitId)]);

  return (
    <DashboardShell roleLabel="Manager" userName={`${user.firstName} ${user.lastName}`}>
      <h1 className="text-2xl font-semibold text-slate-900">Messages — {activeUnit.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Private messages with your unit&apos;s staff.</p>

      <div className="mt-6 space-y-2">
        {threads.map((worker) => (
          <Link
            key={worker.id}
            href={`/manager/${unitId}/messages/${worker.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
          >
            <span className="font-medium text-slate-900">
              {worker.firstName} {worker.lastName}
            </span>
            {worker.unreadCount > 0 && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                {worker.unreadCount} new
              </span>
            )}
          </Link>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-slate-500">No staff assigned to this unit yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

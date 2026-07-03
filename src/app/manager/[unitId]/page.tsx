import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getManagerUnits, getUnitCensus, getApprovalQueue, getUnitStaff } from "@/lib/data/manager";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function ManagerUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const units = await getManagerUnits();
  const activeUnit = units.find((u) => u.id === unitId);

  if (!activeUnit) {
    notFound();
  }

  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [user, shifts, approvalQueue, staff] = await Promise.all([
    getCurrentUser(),
    getUnitCensus(unitId, now, twoWeeksOut),
    getApprovalQueue(unitId),
    getUnitStaff(unitId),
  ]);

  const nav = units.length > 1 && (
    <div className="flex gap-2">
      {units.map((unit) => (
        <Link
          key={unit.id}
          href={`/manager/${unit.id}`}
          className={`rounded-full px-3 py-1 text-sm ${
            unit.id === unitId
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {unit.name}
        </Link>
      ))}
    </div>
  );

  return (
    <DashboardShell
      roleLabel="Manager"
      userName={`${user.firstName} ${user.lastName}`}
      nav={nav}
    >
      <h1 className="text-2xl font-semibold text-slate-900">{activeUnit.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Census, upcoming schedule, and biweekly timecard approvals for this unit.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Live census — next 14 days</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Shift</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Filled</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {shift.startTime.toLocaleString()} – {shift.endTime.toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2">{shift.jobType.name}</td>
                  <td className="px-4 py-2">
                    {shift.filledCount} / {shift.requiredCount}
                  </td>
                  <td className="px-4 py-2">
                    {shift.isUnderstaffed && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Understaffed
                      </span>
                    )}
                    {shift.isOverstaffed && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Overstaffed
                      </span>
                    )}
                    {!shift.isUnderstaffed && !shift.isOverstaffed && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Balanced
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    No shifts scheduled in this window yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Timecard approval queue</h2>
        <p className="text-xs text-slate-400">
          Approve by the Friday before payday week. (Approval actions are not wired up yet in this scaffold.)
        </p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {approvalQueue.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nothing pending approval.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Worker</th>
                  <th className="px-4 py-2">Entry type</th>
                  <th className="px-4 py-2">Timestamp</th>
                  <th className="px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {approvalQueue.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {entry.user.firstName} {entry.user.lastName} (#{entry.user.badgeNumber})
                    </td>
                    <td className="px-4 py-2">{entry.type}</td>
                    <td className="px-4 py-2">{entry.timestamp.toLocaleString()}</td>
                    <td className="px-4 py-2">{entry.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Staff on this unit</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((membership) => (
            <div
              key={membership.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
            >
              <p className="font-medium text-slate-900">
                {membership.user.firstName} {membership.user.lastName}
              </p>
              <p className="text-slate-500">
                {membership.user.jobType?.name ?? "No job type set"} ·{" "}
                {membership.user.accountType.toLowerCase()}
              </p>
              {membership.priorityGroup && (
                <p className="mt-1 text-xs text-slate-400">
                  Priority tier: {membership.priorityGroup.name}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

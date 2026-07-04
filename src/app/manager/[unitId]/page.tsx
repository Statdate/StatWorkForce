import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import {
  getManagerUnits,
  getUnitCensus,
  getApprovalQueue,
  getUnitStaff,
  getSchedulePeriods,
} from "@/lib/data/manager";
import { approveTimeEntryAction, rejectTimeEntryAction } from "@/app/actions/timecards";
import { publishSchedulePeriodAction } from "@/app/actions/schedulePeriods";
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

  const [user, shifts, approvalQueue, staff, schedulePeriods] = await Promise.all([
    getCurrentUser(),
    getUnitCensus(unitId, now, twoWeeksOut),
    getApprovalQueue(unitId),
    getUnitStaff(unitId),
    getSchedulePeriods(unitId),
  ]);

  const nav = (
    <div className="flex flex-wrap gap-2">
      {units.length > 1 &&
        units.map((unit) => (
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
      <Link
        href={`/manager/${unitId}/credentials`}
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Credentials
      </Link>
      <Link
        href={`/manager/${unitId}/time-off`}
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Time off
      </Link>
      <Link
        href={`/manager/${unitId}/messages`}
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Messages
      </Link>
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
        <h2 className="text-lg font-medium text-slate-900">Schedule periods</h2>
        <p className="text-xs text-slate-400">
          Publishing lets workers sync that period&apos;s shifts to their phone calendar.
        </p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {schedulePeriods.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No schedule periods yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedulePeriods.map((period) => (
                  <tr key={period.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {period.startDate.toLocaleDateString()} – {period.endDate.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {period.status === "PUBLISHED" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Published
                          {period.publishedBy &&
                            ` by ${period.publishedBy.firstName} ${period.publishedBy.lastName}`}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {period.status === "DRAFT" && (
                        <form action={publishSchedulePeriodAction}>
                          <input type="hidden" name="schedulePeriodId" value={period.id} />
                          <input type="hidden" name="unitId" value={unitId} />
                          <button
                            type="submit"
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                          >
                            Publish
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Timecard approval queue</h2>
        <p className="text-xs text-slate-400">Approve by the Friday before payday week.</p>
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
                  <th className="px-4 py-2">Actions</th>
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
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        <form action={approveTimeEntryAction}>
                          <input type="hidden" name="timeEntryId" value={entry.id} />
                          <input type="hidden" name="unitId" value={unitId} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectTimeEntryAction}>
                          <input type="hidden" name="timeEntryId" value={entry.id} />
                          <input type="hidden" name="unitId" value={unitId} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
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
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">
                  {membership.user.firstName} {membership.user.lastName}
                </p>
                {membership.user.accountType === "WORKER" && (
                  <Link
                    href={`/manager/${unitId}/messages/${membership.user.id}`}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Message
                  </Link>
                )}
              </div>
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

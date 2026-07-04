import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import {
  getManagerUnits,
  getUnitCensus,
  getApprovalQueue,
  getPendingShiftPickups,
  getUnitStaff,
  getSchedulePeriods,
  getScheduleRequestsForPeriod,
} from "@/lib/data/manager";
import { approveTimeEntryAction, rejectTimeEntryAction } from "@/app/actions/timecards";
import { publishSchedulePeriodAction } from "@/app/actions/schedulePeriods";
import { approveShiftPickupAction, rejectShiftPickupAction } from "@/app/actions/schedule";
import {
  createScheduleRequestWindowAction,
  closeScheduleRequestWindowAction,
} from "@/app/actions/schedule-requests";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionErrorBanner } from "@/components/action-error-banner";

function priorityBadgeClassName(rank: number | undefined) {
  if (rank === 1) return "bg-emerald-100 text-emerald-700";
  if (rank === 2) return "bg-amber-100 text-amber-700";
  if (rank !== undefined) return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-400";
}

export default async function ManagerUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { unitId } = await params;
  const units = await getManagerUnits();
  const activeUnit = units.find((u) => u.id === unitId);

  if (!activeUnit) {
    notFound();
  }

  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [user, shifts, approvalQueue, pendingPickups, staff, schedulePeriods, { error }] = await Promise.all([
    getCurrentUser(),
    getUnitCensus(unitId, now, twoWeeksOut),
    getApprovalQueue(unitId),
    getPendingShiftPickups(unitId),
    getUnitStaff(unitId),
    getSchedulePeriods(unitId),
    searchParams,
  ]);

  const openPeriods = schedulePeriods.filter((p) => p.requestsOpen);
  const requestsByPeriod = new Map(
    await Promise.all(
      openPeriods.map(
        async (p) => [p.id, await getScheduleRequestsForPeriod(p.id)] as const
      )
    )
  );

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

      <div className="mt-4">
        <ActionErrorBanner message={error} />
      </div>

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
        <h2 className="text-lg font-medium text-slate-900">Pending shift pickups</h2>
        <p className="text-xs text-slate-400">
          Workers who&apos;ve self-scheduled onto an open shift — approve before it locks in, so
          you can catch overtime before it happens.
        </p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {pendingPickups.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Nothing pending.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Worker</th>
                  <th className="px-4 py-2">Shift</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPickups.map((pickup) => (
                  <tr key={pickup.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {pickup.user.firstName} {pickup.user.lastName} (#{pickup.user.badgeNumber})
                    </td>
                    <td className="px-4 py-2">
                      {pickup.shift.startTime.toLocaleString()} –{" "}
                      {pickup.shift.endTime.toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">{pickup.shift.jobType.name}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        <form action={approveShiftPickupAction}>
                          <input type="hidden" name="assignmentId" value={pickup.id} />
                          <input type="hidden" name="unitId" value={unitId} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectShiftPickupAction}>
                          <input type="hidden" name="assignmentId" value={pickup.id} />
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
        <h2 className="text-lg font-medium text-slate-900">Schedule periods</h2>
        <p className="text-xs text-slate-400">
          Publishing lets workers sync that period&apos;s shifts to their phone calendar.
        </p>

        <form
          action={createScheduleRequestWindowAction}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="unitId" value={unitId} />
          <label className="block text-sm">
            <span className="text-slate-700">Release a 6-week period for requests</span>
            <input
              type="date"
              name="startDate"
              required
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Release
          </button>
        </form>

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {schedulePeriods.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No schedule periods yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Requests</th>
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
                      {period.requestsOpen ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          Open · {requestsByPeriod.get(period.id)?.length ?? 0} submitted
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
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
                        {period.requestsOpen && (
                          <form action={closeScheduleRequestWindowAction}>
                            <input type="hidden" name="schedulePeriodId" value={period.id} />
                            <input type="hidden" name="unitId" value={unitId} />
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Close requests
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {openPeriods.map((period) => {
          const requests = requestsByPeriod.get(period.id) ?? [];
          if (requests.length === 0) return null;
          return (
            <div key={period.id} className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-slate-900">
                Submitted requests — {period.startDate.toLocaleDateString()} –{" "}
                {period.endDate.toLocaleDateString()}
              </h3>
              <div className="mt-3 space-y-3">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-start justify-between border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {request.user.firstName} {request.user.lastName}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          #{request.user.badgeNumber}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.requestedDates
                          .map((d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" }))
                          .join(", ")}
                      </p>
                      {request.note && <p className="text-xs text-slate-400">{request.note}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClassName(
                        request.priorityGroup?.rank
                      )}`}
                    >
                      {request.priorityGroup?.name ?? "No priority group"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
                {[membership.user.title, membership.user.jobType?.name ?? "No job type set"]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                · {membership.user.accountType.toLowerCase()}
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

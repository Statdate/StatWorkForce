import { getCurrentUser } from "@/lib/dal";
import { getMySchedule, getOpenShifts, getOpenScheduleRequestWindows } from "@/lib/data/worker";
import { signUpForShiftAction } from "@/app/actions/schedule";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { RequestDaysPicker } from "@/components/request-days-picker";
import { ActionErrorBanner } from "@/components/action-error-banner";
import { assignmentStatusLabel } from "@/lib/schedule-types";

export default async function WorkerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, assignments, openShifts, openRequestWindows, { error }] = await Promise.all([
    getCurrentUser(),
    getMySchedule(),
    getOpenShifts(),
    getOpenScheduleRequestWindows(),
    searchParams,
  ]);

  const nav = <WorkerNav active="/worker" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">My schedule</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upcoming shifts you&apos;re assigned to or have signed up for.
      </p>

      <div className="mt-4">
        <ActionErrorBanner message={error} />
      </div>

      <div className="mt-6">
        <ScheduleCalendar
          shifts={assignments.map((a) => ({
            id: a.id,
            startTime: a.shift.startTime,
            endTime: a.shift.endTime,
            unitName: a.shift.unit.name,
          }))}
        />
      </div>

      <div className="mt-6 space-y-3">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-slate-900">{assignment.shift.unit.name}</p>
              <p className="text-sm text-slate-500">
                {assignment.shift.startTime.toLocaleString()} –{" "}
                {assignment.shift.endTime.toLocaleTimeString()}
              </p>
              <p className="text-xs text-slate-400">{assignment.shift.jobType.name}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {assignmentStatusLabel(assignment.status)}
            </span>
          </div>
        ))}
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">
            No upcoming shifts yet. Once your manager publishes the schedule, it&apos;ll show up here.
          </p>
        )}
      </div>

      {openRequestWindows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-slate-900">Schedule requests</h2>
          <p className="text-xs text-slate-400">
            Your manager has opened these periods for requests. Tap the days you&apos;d like to
            work, then submit — everyone can request any day, your manager sees your priority
            group when reviewing.
          </p>
          <div className="mt-3 space-y-4">
            {openRequestWindows.map((period) => (
              <div key={period.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-900">
                  {period.unit.name} · {period.startDate.toLocaleDateString()} –{" "}
                  {period.endDate.toLocaleDateString()}
                </p>
                {period.myRequest && (
                  <p className="mt-1 text-xs text-emerald-700">
                    You submitted {period.myRequest.requestedDates.length} day(s) on{" "}
                    {period.myRequest.updatedAt.toLocaleDateString()} — resubmit below to change it.
                  </p>
                )}
                <div className="mt-3">
                  <RequestDaysPicker
                    schedulePeriodId={period.id}
                    startDate={period.startDate}
                    endDate={period.endDate}
                    initialDates={
                      period.myRequest?.requestedDates.map((d) => d.toISOString().slice(0, 10)) ?? []
                    }
                    initialNote={period.myRequest?.note ?? ""}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Open shifts</h2>
        <p className="text-xs text-slate-400">
          Sign up for a shift below. Priority-tier scheduling windows aren&apos;t enforced yet —
          everyone in the unit can currently sign up any time.
        </p>
        <div className="mt-3 space-y-3">
          {openShifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{shift.unit.name}</p>
                <p className="text-sm text-slate-500">
                  {shift.startTime.toLocaleString()} – {shift.endTime.toLocaleTimeString()}
                </p>
                <p className="text-xs text-slate-400">
                  {shift.jobType.name} · {shift.signedUpCount} / {shift.requiredCount} signed up
                </p>
              </div>
              <form action={signUpForShiftAction}>
                <input type="hidden" name="shiftId" value={shift.id} />
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Sign up
                </button>
              </form>
            </div>
          ))}
          {openShifts.length === 0 && (
            <p className="text-sm text-slate-500">No open shifts to sign up for right now.</p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

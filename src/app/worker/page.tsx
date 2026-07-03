import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getMySchedule } from "@/lib/data/worker";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function WorkerSchedulePage() {
  const [user, assignments] = await Promise.all([getCurrentUser(), getMySchedule()]);

  const nav = (
    <div className="flex gap-2">
      <Link href="/worker" className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">
        My schedule
      </Link>
      <Link
        href="/worker/credentials"
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        My credentials
      </Link>
    </div>
  );

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">My schedule</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upcoming shifts you&apos;re assigned to or have signed up for.
      </p>

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
              {assignment.status.replaceAll("_", " ").toLowerCase()}
            </span>
          </div>
        ))}
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">
            No upcoming shifts yet. Once your manager publishes the schedule, it&apos;ll show up here.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}

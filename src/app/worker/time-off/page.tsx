import { getCurrentUser } from "@/lib/dal";
import { getMyTimeOffRequests } from "@/lib/data/worker";
import { requestTimeOffAction, withdrawTimeOffRequestAction } from "@/app/actions/timeoff";
import { TIME_OFF_TYPE_OPTIONS, TIME_OFF_TYPE_LABELS, timeOffStatusStyle } from "@/lib/timeoff-types";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";

export default async function WorkerTimeOffPage() {
  const [user, requests] = await Promise.all([getCurrentUser(), getMyTimeOffRequests()]);

  const nav = <WorkerNav active="/worker/time-off" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Time off</h1>
      <p className="mt-1 text-sm text-slate-500">
        Need a shift released? Request time off instead of cancelling it yourself — your manager
        reviews it and releases any shifts in that window once approved.
      </p>

      <div className="mt-6 space-y-3">
        {requests.map((request) => {
          const status = timeOffStatusStyle(request.status);
          return (
            <div
              key={request.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{TIME_OFF_TYPE_LABELS[request.type]}</p>
                <p className="text-sm text-slate-500">
                  {request.startDate.toLocaleDateString()} – {request.endDate.toLocaleDateString()}
                </p>
                {request.reason && <p className="text-xs text-slate-400">{request.reason}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
                {request.status === "PENDING" && (
                  <form action={withdrawTimeOffRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Withdraw
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {requests.length === 0 && (
          <p className="text-sm text-slate-500">No time off requests yet.</p>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Request time off</h2>
        <form action={requestTimeOffAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-700">Type</span>
            <select
              name="type"
              required
              defaultValue=""
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Choose a type…
              </option>
              {TIME_OFF_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div />
          <label className="block text-sm">
            <span className="text-slate-700">Start date</span>
            <input
              type="date"
              name="startDate"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">End date</span>
            <input
              type="date"
              name="endDate"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-700">Reason (optional)</span>
            <input
              type="text"
              name="reason"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Submit request
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

import { getCurrentUser } from "@/lib/dal";
import { getMyTimeOffRequests } from "@/lib/data/worker";
import { withdrawTimeOffRequestAction } from "@/app/actions/timeoff";
import { TIME_OFF_TYPE_LABELS, timeOffStatusStyle } from "@/lib/timeoff-types";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";
import { ActionErrorBanner } from "@/components/action-error-banner";
import { TimeOffRequestForm } from "@/components/time-off-request-form";

export default async function WorkerTimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, requests, { error }] = await Promise.all([
    getCurrentUser(),
    getMyTimeOffRequests(),
    searchParams,
  ]);

  const nav = <WorkerNav active="/worker/time-off" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Time off</h1>
      <p className="mt-1 text-sm text-slate-500">
        Need a shift released? Request time off instead of cancelling it yourself — your manager
        reviews it and releases any shifts in that window once approved.
      </p>

      <div className="mt-4">
        <ActionErrorBanner message={error} />
      </div>

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
                  {request.startDate.toLocaleDateString()} – {request.endDate.toLocaleDateString()}{" "}
                  · {request.hours} hours
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
        <TimeOffRequestForm />
      </div>
    </DashboardShell>
  );
}

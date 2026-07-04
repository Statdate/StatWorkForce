import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getManagerUnits, getUnitTimeOffRequestsForManager } from "@/lib/data/manager";
import { reviewTimeOffRequestAction } from "@/app/actions/timeoff";
import { TIME_OFF_TYPE_LABELS, timeOffStatusStyle } from "@/lib/timeoff-types";
import { DashboardShell } from "@/components/dashboard-shell";
import { ActionErrorBanner } from "@/components/action-error-banner";
import { ManagerNav } from "@/components/manager-nav";

export default async function ManagerTimeOffPage({
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

  const [user, { error }] = await Promise.all([getCurrentUser(), searchParams]);

  // Spans every unit the manager is over, not just the one in the URL —
  // Angela (ADA over Pre-op/PACU A/B/C/Bronch/GI) needs one combined queue,
  // not six separate ones she'd have to click through individually.
  const requests = await getUnitTimeOffRequestsForManager(user);

  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  function unitNamesFor(request: (typeof requests)[number]) {
    return request.user.unitMemberships.map((m) => m.unit.name).join(", ") || "—";
  }

  const nav = <ManagerNav unitId={unitId} active="time-off" />;

  return (
    <DashboardShell roleLabel="Manager" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Time off requests — all units</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every unit you&apos;re over. Approving releases any of the worker&apos;s shifts inside that
        date range back to open shifts.
      </p>

      <div className="mt-4">
        <ActionErrorBanner message={error} />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-slate-900">Pending</h2>
      <div className="mt-3 space-y-3">
        {pending.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-slate-900">
                {request.user.firstName} {request.user.lastName}{" "}
                <span className="text-xs font-normal text-slate-400">#{request.user.badgeNumber}</span>
                {" · "}
                <span className="text-xs font-normal text-slate-400">{unitNamesFor(request)}</span>
              </p>
              <p className="text-sm text-slate-500">
                {TIME_OFF_TYPE_LABELS[request.type]} · {request.startDate.toLocaleDateString()} –{" "}
                {request.endDate.toLocaleDateString()} · {request.hours} hours
              </p>
              {request.reason && <p className="text-xs text-slate-400">{request.reason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <form action={reviewTimeOffRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="unitId" value={unitId} />
                <input type="hidden" name="decision" value="APPROVED" />
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Approve
                </button>
              </form>
              <form action={reviewTimeOffRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="unitId" value={unitId} />
                <input type="hidden" name="decision" value="DENIED" />
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Deny
                </button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <p className="text-sm text-slate-500">No pending requests.</p>
        )}
      </div>

      {decided.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-slate-900">Reviewed</h2>
          <div className="mt-3 space-y-3">
            {decided.map((request) => {
              const status = timeOffStatusStyle(request.status);
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {request.user.firstName} {request.user.lastName}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        #{request.user.badgeNumber}
                      </span>
                      {" · "}
                      <span className="text-xs font-normal text-slate-400">{unitNamesFor(request)}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {TIME_OFF_TYPE_LABELS[request.type]} · {request.startDate.toLocaleDateString()} –{" "}
                      {request.endDate.toLocaleDateString()}
                    </p>
                    {request.reviewedBy && (
                      <p className="text-xs text-slate-400">
                        Reviewed by {request.reviewedBy.firstName} {request.reviewedBy.lastName}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardShell>
  );
}

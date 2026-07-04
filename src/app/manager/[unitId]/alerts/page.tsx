import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import {
  getManagerUnits,
  getUnitScheduleForManager,
  getUnitCredentialsForManager,
} from "@/lib/data/manager";
import { ensureCredentialExpiryNotifications } from "@/lib/data/notifications";
import { credentialStatus } from "@/lib/credential-types";
import { DashboardShell } from "@/components/dashboard-shell";
import { CredentialTable } from "@/components/credential-table";
import { ManagerNav } from "@/components/manager-nav";

const LOOKAHEAD_DAYS = 14;

export default async function ManagerAlertsPage({
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

  await ensureCredentialExpiryNotifications();

  const user = await getCurrentUser();

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  // Alerts span every unit the manager is scoped to, not just the one in the
  // URL — a short-staffed shift or an expiring credential in another of
  // their units is just as urgent.
  const [shifts, { credentials }] = await Promise.all([
    getUnitScheduleForManager(user, from, to),
    getUnitCredentialsForManager(user),
  ]);

  const shortStaffedShifts = shifts
    .filter((s) => s.isUnderstaffed)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const expiringCredentials = credentials
    .filter((c) => credentialStatus(c.expirationDate).label !== "Current")
    .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

  const nav = <ManagerNav unitId={unitId} active="alerts" />;

  return (
    <DashboardShell roleLabel="Manager" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Short-staffed shifts across all your units for the next {LOOKAHEAD_DAYS} days, and
        credentials that need attention.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Short-staffed shifts</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {shortStaffedShifts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              Nothing short-staffed in the next {LOOKAHEAD_DAYS} days.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Shift</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Filled</th>
                </tr>
              </thead>
              <tbody>
                {shortStaffedShifts.map((shift) => (
                  <tr key={shift.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{shift.startTime.toLocaleDateString()}</td>
                    <td className="px-4 py-2">{shift.unit.name}</td>
                    <td className="px-4 py-2">
                      {shift.startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
                      {shift.endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">{shift.jobType.name}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {shift.filledCount} / {shift.requiredCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Credential expirations</h2>
        <p className="text-xs text-slate-400">Expired or expiring within the next 60 days.</p>
        <div className="mt-3">
          {expiringCredentials.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              No credentials need attention right now.
            </p>
          ) : (
            <CredentialTable rows={expiringCredentials} />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

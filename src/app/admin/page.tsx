import Link from "next/link";
import { getOrgOverview } from "@/lib/data/admin";
import { getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminPage() {
  const [user, { hospital, units, openCallIns }] = await Promise.all([
    getCurrentUser(),
    getOrgOverview(),
  ]);

  const nav = (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">Overview</span>
      <Link
        href="/admin/credentials"
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Credentials
      </Link>
    </div>
  );

  return (
    <DashboardShell roleLabel="Admin" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">{hospital.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Org-wide overview across all units.</p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Units</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <div key={unit.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">{unit.name}</h3>
                <span className="text-xs uppercase tracking-wide text-slate-400">{unit.type}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{unit._count.memberships} staff assigned</p>
              <p className="mt-1 text-xs text-slate-400">
                {unit.memberships.length > 0
                  ? `Manager: ${unit.memberships
                      .map((m) => `${m.user.firstName} ${m.user.lastName}`)
                      .join(", ")}`
                  : "No manager assigned yet"}
              </p>
            </div>
          ))}
          {units.length === 0 && (
            <p className="text-sm text-slate-500">No units yet — run the seed script to add sample data.</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-slate-900">Open call-ins</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {openCallIns.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No open call-ins right now.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Shift</th>
                  <th className="px-4 py-2">Called in by</th>
                  <th className="px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {openCallIns.map((callIn) => (
                  <tr key={callIn.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{callIn.shift.unit.name}</td>
                    <td className="px-4 py-2">
                      {callIn.shift.startTime.toLocaleString()} –{" "}
                      {callIn.shift.endTime.toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      {callIn.reportedBy.firstName} {callIn.reportedBy.lastName}
                    </td>
                    <td className="px-4 py-2">{callIn.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

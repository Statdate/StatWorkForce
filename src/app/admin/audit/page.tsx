import { AdminNav } from "@/components/admin-nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dal";
import { getHospitalAuditLogs } from "@/lib/data/admin";

export default async function AdminAuditPage() {
  const [user, { items }] = await Promise.all([
    getCurrentUser(),
    getHospitalAuditLogs({ limit: 100 }),
  ]);

  return (
    <DashboardShell
      roleLabel="Admin"
      userName={`${user.firstName} ${user.lastName}`}
      nav={<AdminNav active="audit" />}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Security-sensitive activity for this hospital, newest first.
          </p>
        </div>
        <a
          href="/api/admin/audit-logs/export"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-t border-slate-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {log.occurredAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {log.actor
                    ? `${log.actor.firstName} ${log.actor.lastName} (#${log.actor.badgeNumber})`
                    : "System / deleted user"}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                <td className="px-4 py-3 text-slate-600">
                  {log.resourceType}
                  {log.resourceId ? ` · ${log.resourceId}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">{log.outcome}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No audited activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

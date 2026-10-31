import { AdminNav } from "@/components/admin-nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dal";
import { getPushDeliveryOverview } from "@/lib/data/admin";

const statuses = ["PENDING", "PROCESSING", "SENT", "FAILED", "SKIPPED"] as const;

export default async function DeliveryPage() {
  const [user, { counts, recentFailures }] = await Promise.all([
    getCurrentUser(),
    getPushDeliveryOverview(),
  ]);

  return (
    <DashboardShell
      roleLabel="Admin"
      userName={`${user.firstName} ${user.lastName}`}
      nav={<AdminNav active="delivery" />}
    >
      <h1 className="text-2xl font-semibold text-slate-900">Notification delivery</h1>
      <p className="mt-1 text-sm text-slate-500">Push outbox health for this hospital.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statuses.map((status) => (
          <div key={status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Recent failed attempts</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {recentFailures.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No push deliveries are waiting after a failure.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Recipient</th><th className="px-4 py-2">Alert</th><th className="px-4 py-2">Attempts</th><th className="px-4 py-2">Next attempt</th><th className="px-4 py-2">Error</th></tr>
              </thead>
              <tbody>
                {recentFailures.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-4 py-2">{item.user.firstName} {item.user.lastName}<br /><span className="text-xs text-slate-500">#{item.user.badgeNumber}</span></td>
                    <td className="px-4 py-2">{item.title}</td>
                    <td className="px-4 py-2">{item.pushAttempts}</td>
                    <td className="whitespace-nowrap px-4 py-2">{item.pushNextAttemptAt.toLocaleString()}</td>
                    <td className="max-w-md px-4 py-2 text-slate-600">{item.pushLastError ?? "Unknown error"}</td>
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

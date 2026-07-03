import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getManagerUnits, getUnitCredentials } from "@/lib/data/manager";
import { ensureCredentialExpiryNotifications, getMyNotifications } from "@/lib/data/notifications";
import { DashboardShell } from "@/components/dashboard-shell";
import { CredentialTable } from "@/components/credential-table";
import { PrintButton } from "@/components/print-button";

export default async function ManagerCredentialsPage({
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

  // Generate any due expiry reminders before reading, so this page (the
  // manager's main credential surface) always reflects the latest alerts.
  await ensureCredentialExpiryNotifications();

  const [user, { credentials, workersWithoutCredentials }, notifications] = await Promise.all([
    getCurrentUser(),
    getUnitCredentials(unitId),
    getMyNotifications({ markRead: true }),
  ]);

  const unreadAlerts = notifications.filter((n) => !n.readAt);

  const nav = (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Link
        href={`/manager/${unitId}`}
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Dashboard
      </Link>
      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">Credentials</span>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {activeUnit.name} — worker credentials
          </h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Every worker in the unit, soonest expiration first. Reminders go out to workers and
            to you starting 2 months before a credential expires.
          </p>
        </div>
        <PrintButton />
      </div>

      {unreadAlerts.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 print:hidden">
          <h2 className="text-sm font-semibold text-amber-800">New credential alerts</h2>
          <ul className="mt-2 space-y-1">
            {unreadAlerts.map((n) => (
              <li key={n.id} className="text-sm text-amber-800">
                {n.title}
                {n.body ? <span className="text-amber-700"> — {n.body}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <CredentialTable rows={credentials} />
      </div>

      {workersWithoutCredentials.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Nothing on file</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workersWithoutCredentials
              .map((w) => `${w.firstName} ${w.lastName} (#${w.badgeNumber})`)
              .join(", ")}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}

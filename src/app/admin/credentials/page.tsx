import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getHospitalCredentials } from "@/lib/data/admin";
import { ensureCredentialExpiryNotifications } from "@/lib/data/notifications";
import { DashboardShell } from "@/components/dashboard-shell";
import { CredentialTable, type CredentialRow } from "@/components/credential-table";
import { PrintButton } from "@/components/print-button";

export default async function AdminCredentialsPage() {
  await ensureCredentialExpiryNotifications();

  const [user, { credentials, workersWithoutCredentials }] = await Promise.all([
    getCurrentUser(),
    getHospitalCredentials(),
  ]);

  const rows: CredentialRow[] = credentials.map((credential) => ({
    ...credential,
    unitNames: credential.user.unitMemberships.map((m) => m.unit.name),
  }));

  const nav = (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Link
        href="/admin"
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        Overview
      </Link>
      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">Credentials</span>
    </div>
  );

  return (
    <DashboardShell roleLabel="Admin" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Worker credentials — all units</h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Every worker in the hospital, soonest expiration first.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-6">
        <CredentialTable rows={rows} showUnits />
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

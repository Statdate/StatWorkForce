import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getMyCredentials } from "@/lib/data/worker";
import { DashboardShell } from "@/components/dashboard-shell";

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

function credentialStatus(expirationDate: Date) {
  const now = Date.now();
  const expiresAt = expirationDate.getTime();
  if (expiresAt < now) return { label: "Expired", className: "bg-red-100 text-red-700" };
  if (expiresAt - now < TWO_MONTHS_MS)
    return { label: "Expiring soon", className: "bg-amber-100 text-amber-700" };
  return { label: "Current", className: "bg-emerald-100 text-emerald-700" };
}

export default async function WorkerCredentialsPage() {
  const [user, credentials] = await Promise.all([getCurrentUser(), getMyCredentials()]);

  const nav = (
    <div className="flex gap-2">
      <Link
        href="/worker"
        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
      >
        My schedule
      </Link>
      <Link href="/worker/credentials" className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">
        My credentials
      </Link>
    </div>
  );

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">My credentials</h1>
      <p className="mt-1 text-sm text-slate-500">
        Licenses and certifications on file. You&apos;ll get a reminder 2 months before expiration.
      </p>

      <div className="mt-6 space-y-3">
        {credentials.map((credential) => {
          const status = credentialStatus(credential.expirationDate);
          return (
            <div
              key={credential.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {credential.customName ?? credential.type.replaceAll("_", " ")}
                </p>
                <p className="text-sm text-slate-500">{credential.issuingBody ?? "Issuing body not set"}</p>
                <p className="text-xs text-slate-400">
                  Expires {credential.expirationDate.toLocaleDateString()}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
          );
        })}
        {credentials.length === 0 && (
          <p className="text-sm text-slate-500">No credentials on file yet.</p>
        )}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Document upload isn&apos;t wired up in this scaffold yet — file storage provider still needs to be chosen.
      </p>
    </DashboardShell>
  );
}

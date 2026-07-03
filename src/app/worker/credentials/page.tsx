import { getCurrentUser } from "@/lib/dal";
import { getMyCredentials } from "@/lib/data/worker";
import { uploadCredentialFileAction } from "@/app/actions/credentials";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";

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

  const nav = <WorkerNav active="/worker/credentials" />;

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
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
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

              <div className="mt-3 border-t border-slate-100 pt-3">
                {credential.fileName ? (
                  <p className="text-xs text-slate-500">
                    <a
                      href={`/api/credentials/${credential.id}/file`}
                      target="_blank"
                      className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
                    >
                      View document
                    </a>{" "}
                    · {credential.fileName}
                    {credential.fileUploadedAt &&
                      ` · uploaded ${credential.fileUploadedAt.toLocaleDateString()}`}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">No document uploaded yet.</p>
                )}
                <form action={uploadCredentialFileAction} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="credentialId" value={credential.id} />
                  <input
                    type="file"
                    name="file"
                    required
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    {credential.fileName ? "Replace" : "Upload"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {credentials.length === 0 && (
          <p className="text-sm text-slate-500">No credentials on file yet.</p>
        )}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        PDF or image (JPEG, PNG, WebP, HEIC), up to 10 MB.
      </p>
    </DashboardShell>
  );
}

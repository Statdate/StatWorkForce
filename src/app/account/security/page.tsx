import { changeOwnPasswordAction } from "@/app/actions/password";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dal";

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; changed?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  return (
    <DashboardShell
      roleLabel={user.accountType === "ADMIN" ? "Admin" : user.accountType === "MANAGER" ? "Manager" : "Worker"}
      userName={`${user.firstName} ${user.lastName}`}
    >
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Account security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Changing your password signs out every other web browser and mobile device.
        </p>
        {params.error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}
        {params.changed === "true" && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Password changed. Other sessions have been revoked.
          </div>
        )}
        <form action={changeOwnPasswordAction} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm text-slate-700">
            Current password
            <input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm text-slate-700">
            New password
            <input name="newPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm text-slate-700">
            Confirm new password
            <input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
          </label>
          <p className="text-xs text-slate-500">
            Use 12 or more characters with uppercase, lowercase, a number, and a symbol.
          </p>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Change password
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

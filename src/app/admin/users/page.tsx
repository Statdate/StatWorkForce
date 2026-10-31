import { AdminNav } from "@/components/admin-nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dal";
import { getHospitalUsers, getUserProvisioningOptions } from "@/lib/data/admin";
import {
  createHospitalUserAction,
  revokeUserSessionsAction,
  resetUserPasswordAction,
  setUserActiveStateAction,
  updateUserAccessAction,
  unlockUserLoginAction,
} from "@/app/actions/admin-users";
import Link from "next/link";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [currentUser, users, provisioningOptions, params] = await Promise.all([
    getCurrentUser(),
    getHospitalUsers(),
    getUserProvisioningOptions(),
    searchParams,
  ]);
  const { units, jobTypes } = provisioningOptions;

  return (
    <DashboardShell
      roleLabel="Admin"
      userName={`${currentUser.firstName} ${currentUser.lastName}`}
      nav={<AdminNav active="users" />}
    >
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hospital accounts, access status, unit assignments, and session controls.
      </p>
      {params.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-medium text-slate-900">Bulk CSV onboarding</h2><p className="mt-1 text-sm text-slate-500">Preview first. Import creates new accounts only and returns unique temporary passwords once.</p></div>
          <Link href="/api/admin/users/import" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Download template</Link>
        </div>
        <form method="post" encType="multipart/form-data" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-700">User CSV<input type="file" name="file" accept=".csv,text/csv" required className="mt-1 block text-sm" /></label>
          <button formAction="/api/admin/users/import?mode=preview" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Validate only</button>
          <button formAction="/api/admin/users/import?mode=import" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">Import validated CSV</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Maximum 200 users/1 MiB. Unit and job-type names must already exist. Store the returned password file in an approved secure channel, then delete it after distribution.</p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Add worker or manager</h2>
        <p className="mt-1 text-sm text-slate-500">
          Provide a temporary password through an approved channel. The user must replace it on first web sign-in.
        </p>
        <form action={createHospitalUserAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">First name<input name="firstName" required maxLength={80} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Last name<input name="lastName" required maxLength={80} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Badge number<input name="badgeNumber" required maxLength={64} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Email (optional)<input name="email" type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Role<select name="accountType" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="WORKER">Worker</option><option value="MANAGER">Manager</option></select></label>
          <label className="text-sm text-slate-700">Job type<select name="jobTypeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="">Select a job type</option>{jobTypes.map((jobType) => <option key={jobType.id} value={jobType.id}>{jobType.name}</option>)}</select></label>
          <label className="text-sm text-slate-700">Temporary password<input name="temporaryPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs text-slate-500">12+ characters with uppercase, lowercase, number, and symbol.</span></label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm text-slate-700">Units</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {units.map((unit) => <label key={unit.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name="unitIds" value={unit.id} />{unit.name}</label>)}
            </div>
          </fieldset>
          <div className="md:col-span-2"><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Create account</button></div>
        </form>
      </section>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-slate-500">
                    #{user.badgeNumber}{user.email ? ` · ${user.email}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.accountType}{user.jobType ? ` · ${user.jobType.name}` : ""}{user.title ? ` · ${user.title}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {user.unitMemberships.map((membership) => membership.unit.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      user.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                  {user.loginLockedUntil && (
                    <div className="mt-2">
                      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        Login locked until {user.loginLockedUntil.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {user.loginLockedUntil && (
                      <form action={unlockUserLoginAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Unlock login</button>
                      </form>
                    )}
                    {user.isActive && (
                      <>
                        <form action={revokeUserSessionsAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                            Revoke sessions
                          </button>
                        </form>
                        {user.id !== currentUser.id && (
                          <details className="relative">
                            <summary className="cursor-pointer list-none rounded border border-amber-300 px-2 py-1 text-xs text-amber-800 hover:bg-amber-50">
                              Reset password
                            </summary>
                            <form action={resetUserPasswordAction} className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
                              <input type="hidden" name="userId" value={user.id} />
                              <label className="block text-xs font-medium text-slate-700">
                                New temporary password
                                <input name="temporaryPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                              </label>
                              <p className="mt-1 text-xs text-slate-500">12+ characters with uppercase, lowercase, number, and symbol. This revokes all sessions.</p>
                              <button className="mt-2 w-full rounded bg-amber-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-700">Issue temporary password</button>
                            </form>
                          </details>
                        )}
                      </>
                    )}
                    {user.id !== currentUser.id && (
                      <form action={setUserActiveStateAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="active" value={user.isActive ? "false" : "true"} />
                        <button
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            user.isActive
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                    {user.id !== currentUser.id && user.accountType !== "ADMIN" && (
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                          Edit access
                        </summary>
                        <form action={updateUserAccessAction} className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
                          <input type="hidden" name="userId" value={user.id} />
                          <label className="block text-xs font-medium text-slate-700">Role<select name="accountType" defaultValue={user.accountType} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"><option value="WORKER">Worker</option><option value="MANAGER">Manager</option></select></label>
                          <label className="mt-3 block text-xs font-medium text-slate-700">Job type<select name="jobTypeId" defaultValue={user.jobTypeId ?? ""} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"><option value="">None</option>{jobTypes.map((jobType) => <option key={jobType.id} value={jobType.id}>{jobType.name}</option>)}</select></label>
                          <fieldset className="mt-3"><legend className="text-xs font-medium text-slate-700">Units</legend><div className="mt-1 max-h-40 space-y-1 overflow-y-auto">{units.map((unit) => <label key={unit.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="unitIds" value={unit.id} defaultChecked={user.unitMemberships.some((membership) => membership.unit.id === unit.id)} />{unit.name}</label>)}</div></fieldset>
                          <p className="mt-2 text-xs text-slate-500">Saving revokes active sessions so the new access takes effect immediately.</p>
                          <button className="mt-2 w-full rounded bg-slate-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Save access</button>
                        </form>
                      </details>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

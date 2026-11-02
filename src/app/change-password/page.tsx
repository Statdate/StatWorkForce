import { changeInitialPasswordAction } from "@/app/actions/password";
import { getPasswordChangeUser } from "@/lib/dal";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, params] = await Promise.all([getPasswordChangeUser(), searchParams]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Welcome, {user.firstName}. Replace your temporary password before accessing hospital information.</p>
        {params.error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div>}
        <form action={changeInitialPasswordAction} className="mt-5 space-y-4">
          <label className="block text-sm text-slate-700">Temporary password<input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm text-slate-700">New password<input name="newPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block text-sm text-slate-700">Confirm new password<input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <p className="text-xs text-slate-500">Use 12 or more characters with uppercase, lowercase, a number, and a symbol.</p>
          <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Set password and continue</button>
        </form>
      </section>
    </main>
  );
}

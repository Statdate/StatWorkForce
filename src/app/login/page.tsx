"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Stat Workforce</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with your badge number and password.
        </p>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label htmlFor="badgeNumber" className="block text-sm font-medium text-slate-700">
              Badge number
            </label>
            <input
              id="badgeNumber"
              name="badgeNumber"
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            {state?.errors?.badgeNumber && (
              <p className="mt-1 text-xs text-red-600">{state.errors.badgeNumber[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            {state?.errors?.password && (
              <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Shared hospital computer? This same login works — just sign out when you&apos;re done.
        </p>
      </div>
    </div>
  );
}

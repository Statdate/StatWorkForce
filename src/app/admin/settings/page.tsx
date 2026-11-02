import {
  createHospitalJobTypeAction,
  createHospitalUnitAction,
  updateHospitalUnitAction,
  updateHospitalSchedulingPolicyAction,
  updateJobTypeCredentialRequirementsAction,
} from "@/app/actions/admin-settings";
import { AdminNav } from "@/components/admin-nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { CREDENTIAL_TYPE_OPTIONS } from "@/lib/credential-types";
import { getCurrentUser } from "@/lib/dal";
import { getHospitalUnitSettings, getJobTypes } from "@/lib/data/admin";
import { UnitType } from "@/generated/prisma/client";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [user, jobTypes, units, params] = await Promise.all([
    getCurrentUser(),
    getJobTypes(),
    getHospitalUnitSettings(),
    searchParams,
  ]);
  return (
    <DashboardShell
      roleLabel="Admin"
      userName={`${user.firstName} ${user.lastName}`}
      nav={<AdminNav active="settings" />}
    >
      <h1 className="text-2xl font-semibold text-slate-900">Hospital settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Configure which credentials must remain current through the end of a shift for each job type.
      </p>
      {params.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </div>
      )}
      <form action={updateHospitalSchedulingPolicyAction} className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Scheduling workload policy</h2>
        <p className="mt-1 text-sm text-slate-500">
          Defines the local reporting week and when projected-hours warnings appear. This is an operational signal, not a payroll determination.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-700">IANA time zone<input name="timeZone" required defaultValue={user.hospital.timeZone} placeholder="America/Los_Angeles" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Week starts<select name="weekStartsOn" defaultValue={String(user.hospital.weekStartsOn)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></label>
          <label className="text-sm text-slate-700">Warning threshold (hours)<input name="weeklyHoursWarning" type="number" min="1" max="168" step="0.5" required defaultValue={user.hospital.weeklyHoursWarning} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        </div>
        <button className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Save scheduling policy</button>
      </form>
      <h2 className="mt-8 text-lg font-medium text-slate-900">Hospital units</h2>
      <form action={createHospitalUnitAction} className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-medium text-slate-900">Add unit</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-sm text-slate-700">Unit name<input name="name" required maxLength={100} placeholder="e.g. Cardiovascular ICU" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Unit type<select name="type" defaultValue="OTHER" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{Object.values(UnitType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Add unit</button>
        </div>
      </form>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {units.map((unit) => (
          <form key={unit.id} action={updateHospitalUnitAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="unitId" value={unit.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-700">Name<input name="name" required maxLength={100} defaultValue={unit.name} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-700">Type<select name="type" defaultValue={unit.type} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{Object.values(UnitType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{unit._count.memberships} staff · {unit._count.shifts} shifts</p>
              <button className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Save unit</button>
            </div>
          </form>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-medium text-slate-900">Credential requirements by job type</h2>
      <form action={createHospitalJobTypeAction} className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-medium text-slate-900">Add job type</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-sm text-slate-700">Name<input name="name" required maxLength={80} placeholder="e.g. Surgical Technologist" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm text-slate-700">Category (optional)<input name="category" maxLength={80} placeholder="e.g. Perioperative Services" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Add job type</button>
        </div>
      </form>
      <div className="mt-6 space-y-4">
        {jobTypes.map((jobType) => (
          <form key={jobType.id} action={updateJobTypeCredentialRequirementsAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="jobTypeId" value={jobType.id} />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-48">
                <h2 className="font-medium text-slate-900">{jobType.name}</h2>
                <p className="text-xs text-slate-500">{jobType.category ?? "Uncategorized"}</p>
              </div>
              <fieldset className="flex-1">
                <legend className="text-sm font-medium text-slate-700">Required current credentials</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {CREDENTIAL_TYPE_OPTIONS.map(([type, label]) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="credentialTypes" value={type} defaultChecked={jobType.requiredCredentialTypes.includes(type)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Save requirements
              </button>
            </div>
          </form>
        ))}
      </div>
    </DashboardShell>
  );
}

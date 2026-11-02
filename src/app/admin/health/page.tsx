import { AdminNav } from "@/components/admin-nav";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/dal";
import { getOperationalHealth } from "@/lib/data/operational-health";

export default async function AdminHealthPage() {
  const [user, health] = await Promise.all([getCurrentUser(), getOperationalHealth()]);
  const total = health.staffingGaps.length + health.credentialRisks.length + health.overlaps.length + health.failedPushDeliveries;
  return (
    <DashboardShell roleLabel="Admin" userName={`${user.firstName} ${user.lastName}`} nav={<AdminNav active="health" />}>
      <h1 className="text-2xl font-semibold text-slate-900">Operational health</h1>
      <p className="mt-1 text-sm text-slate-500">Automated checks across published shifts for the next 90 days. Generated {health.generatedAt.toLocaleString()}.</p>
      {health.shiftLimitReached && <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">The 500-shift analysis limit was reached. Use the managed capacity review for a complete result.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Staffing gaps", health.staffingGaps.length],
          ["Credential risks", health.credentialRisks.length],
          ["Overlaps", health.overlaps.length],
          ["Failed pushes", health.failedPushDeliveries],
        ].map(([label, count]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{count}</p></div>)}
      </div>
      {total === 0 && <p className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No operational anomalies detected in the current analysis window.</p>}
      <section className="mt-8"><h2 className="text-lg font-medium text-slate-900">Staffing gaps</h2><div className="mt-3 space-y-2">{health.staffingGaps.slice(0, 50).map((item) => <p key={item.shiftId} className="rounded border border-slate-200 bg-white p-3 text-sm">{item.unitName} · {item.jobTypeName} · {item.startTime.toLocaleString()} · {item.assignedCount}/{item.requiredCount} assigned</p>)}{health.staffingGaps.length === 0 && <p className="text-sm text-slate-500">None detected.</p>}</div></section>
      <section className="mt-8"><h2 className="text-lg font-medium text-slate-900">Credential risks</h2><div className="mt-3 space-y-2">{health.credentialRisks.slice(0, 50).map((item) => <p key={`${item.shiftId}-${item.userId}`} className="rounded border border-slate-200 bg-white p-3 text-sm">{item.workerName} · {item.unitName} · {item.startTime.toLocaleString()} · missing/expired through shift end: {item.missingCredentialTypes.join(", ")}</p>)}{health.credentialRisks.length === 0 && <p className="text-sm text-slate-500">None detected.</p>}</div></section>
      <section className="mt-8"><h2 className="text-lg font-medium text-slate-900">Overlapping assignments</h2><div className="mt-3 space-y-2">{health.overlaps.slice(0, 50).map((item) => <p key={`${item.userId}-${item.firstShiftId}-${item.secondShiftId}`} className="rounded border border-slate-200 bg-white p-3 text-sm">{item.workerName} · {item.firstUnitName} / {item.secondUnitName} · overlap begins {item.overlapStartsAt.toLocaleString()}</p>)}{health.overlaps.length === 0 && <p className="text-sm text-slate-500">None detected.</p>}</div></section>
    </DashboardShell>
  );
}

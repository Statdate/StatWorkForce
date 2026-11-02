import { getApiUser } from "@/lib/dal";
import { getHospitalAuditExport } from "@/lib/data/admin";
import { corsJson } from "@/lib/cors";
import { csvCell } from "@/lib/csv";

export async function GET() {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can export audit logs" }, { status: 403 });
  }

  const logs = await getHospitalAuditExport();
  const rows = [
    ["occurredAt", "actor", "badgeNumber", "action", "resourceType", "resourceId", "outcome"],
    ...logs.map((log) => [
      log.occurredAt.toISOString(),
      log.actor ? `${log.actor.firstName} ${log.actor.lastName}`.trim() : "System / deleted user",
      log.actor?.badgeNumber ?? "",
      log.action,
      log.resourceType,
      log.resourceId ?? "",
      log.outcome,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statworkforce-audit-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

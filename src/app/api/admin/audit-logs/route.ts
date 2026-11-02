import { getApiUser } from "@/lib/dal";
import { getHospitalAuditLogs } from "@/lib/data/admin";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can view audit logs" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;
  const result = await getHospitalAuditLogs({
    cursor: searchParams.get("cursor") ?? undefined,
    limit,
  });
  return corsJson(result);
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

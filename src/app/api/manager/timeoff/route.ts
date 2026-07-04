import { getApiUser } from "@/lib/dal";
import { getUnitTimeOffRequestsForManager } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** Mobile's manager approval queue — aggregated across every unit the
 * manager/admin is scoped to, since mobile has no per-unit navigation like
 * web's /manager/[unitId]/time-off page. */
export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can view the approval queue" }, { status: 403 });
  }

  const requests = await getUnitTimeOffRequestsForManager(user);
  return corsJson({ requests });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

import { getApiUser } from "@/lib/dal";
import { getUnitCredentialsForManager } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** Mobile's manager credential-expiration overview — aggregated across every
 * unit the manager/admin is scoped to, since mobile has no per-unit
 * navigation like web's /manager/[unitId]/credentials page. */
export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can view unit credential expirations" }, { status: 403 });
  }

  const { credentials, workersWithoutCredentials } = await getUnitCredentialsForManager(user);
  return corsJson({ credentials, workersWithoutCredentials });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

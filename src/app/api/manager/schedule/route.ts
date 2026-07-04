import { getApiUser } from "@/lib/dal";
import { getUnitScheduleForManager } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

const DEFAULT_WINDOW_DAYS_BACK = 30;
const DEFAULT_WINDOW_DAYS_FORWARD = 90;

/** Mobile's Unit Schedule calendar — aggregated staffing census across every
 * unit the manager/admin is scoped to, since mobile has no per-unit
 * navigation like web's /manager/[unitId] dashboard. Defaults to a wide
 * window so the calendar can page back/forward a couple months without
 * refetching. */
export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can view the unit schedule" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(now.getTime() - DEFAULT_WINDOW_DAYS_BACK * 24 * 60 * 60 * 1000);
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : new Date(now.getTime() + DEFAULT_WINDOW_DAYS_FORWARD * 24 * 60 * 60 * 1000);

  const shifts = await getUnitScheduleForManager(user, from, to);
  return corsJson({ shifts });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

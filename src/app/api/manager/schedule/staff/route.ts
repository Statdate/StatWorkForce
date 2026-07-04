import { getApiUser } from "@/lib/dal";
import { getUnitWorkersForManager } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** Worker picker for the "offer this shift to" flow. */
export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can view unit staff" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId");
  if (!unitId) {
    return corsJson({ error: "unitId is required" }, { status: 400 });
  }

  try {
    const workers = await getUnitWorkersForManager(user, unitId);
    return corsJson({ workers });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not load unit staff" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

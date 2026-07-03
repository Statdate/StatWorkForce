import { getApiUser } from "@/lib/dal";
import { getOpenShiftsForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const shifts = await getOpenShiftsForUser(user);
  return corsJson({ shifts });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

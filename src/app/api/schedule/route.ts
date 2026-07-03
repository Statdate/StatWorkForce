import { getApiUser } from "@/lib/dal";
import { getScheduleForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const assignments = await getScheduleForUser(user.id);
  return corsJson({ assignments });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

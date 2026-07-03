import { getApiUser } from "@/lib/dal";
import { getMessageThreadsForUser } from "@/lib/data/messages";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const threads = await getMessageThreadsForUser(user);
  return corsJson({ threads });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

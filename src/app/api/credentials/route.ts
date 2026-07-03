import { getApiUser } from "@/lib/dal";
import { getCredentialsForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const credentials = await getCredentialsForUser(user.id);
  return corsJson({ credentials });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

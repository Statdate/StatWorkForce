import { getApiUser } from "@/lib/dal";
import { revokeAllSessionsForUser } from "@/lib/data/admin";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can revoke sessions" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    await revokeAllSessionsForUser(userId);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not revoke sessions" },
      { status: 404 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

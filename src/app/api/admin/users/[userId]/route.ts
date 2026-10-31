import { getApiUser } from "@/lib/dal";
import { setUserActiveState } from "@/lib/data/admin";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can change account status" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.isActive !== "boolean") {
    return corsJson({ error: "isActive must be a boolean" }, { status: 400 });
  }

  try {
    const { userId } = await params;
    await setUserActiveState(userId, body.isActive);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not update user" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

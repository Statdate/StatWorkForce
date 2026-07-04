import { getApiUser } from "@/lib/dal";
import { withdrawTimeOffRequestForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** Withdraw a pending time-off request — same rule as the web action: only
 * the requester, and only before a manager has decided. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const { requestId } = await params;
  try {
    await withdrawTimeOffRequestForUser(user.id, requestId);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Withdraw failed" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

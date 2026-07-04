import { getApiUser } from "@/lib/dal";
import { setShiftPickupApprovalForManager } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can review shift pickups" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.decision !== "APPROVED" && body?.decision !== "DENIED") {
    return corsJson({ error: "decision must be APPROVED or DENIED" }, { status: 400 });
  }

  const { assignmentId } = await params;
  try {
    await setShiftPickupApprovalForManager(user, assignmentId, body.decision);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

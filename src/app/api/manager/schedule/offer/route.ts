import { getApiUser } from "@/lib/dal";
import { offerShiftToWorker } from "@/lib/data/manager";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    return corsJson({ error: "Only managers can offer shifts" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.shiftId || !body?.workerId) {
    return corsJson({ error: "shiftId and workerId are required" }, { status: 400 });
  }

  try {
    await offerShiftToWorker(user, body.shiftId, body.workerId);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not offer shift" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

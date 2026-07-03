import { getApiUser } from "@/lib/dal";
import { dropShiftAsUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const shiftId = body?.shiftId;
  if (typeof shiftId !== "string") {
    return corsJson({ error: "shiftId is required" }, { status: 400 });
  }

  try {
    await dropShiftAsUser(user.id, shiftId);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson({ error: error instanceof Error ? error.message : "Cancel failed" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

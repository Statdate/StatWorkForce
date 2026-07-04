import { getApiUser } from "@/lib/dal";
import { requestTimeOffForUser, getTimeOffRequestsForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const requests = await getTimeOffRequestsForUser(user.id);
  return corsJson({ requests });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.type || !body?.startDate || !body?.endDate || !body?.hours) {
    return corsJson({ error: "type, startDate, endDate, and hours are required" }, { status: 400 });
  }

  try {
    const created = await requestTimeOffForUser(user.id, {
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      hours: body.hours,
      reason: body.reason ?? null,
    });
    return corsJson({ request: created });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

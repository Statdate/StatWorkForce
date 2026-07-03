import { getApiUser } from "@/lib/dal";
import { sendMessageAsUser } from "@/lib/data/messages";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recipientId = body?.recipientId;
  const message = body?.body;
  if (typeof recipientId !== "string" || typeof message !== "string") {
    return corsJson({ error: "recipientId and body are required" }, { status: 400 });
  }

  try {
    await sendMessageAsUser(user, recipientId, message);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson({ error: error instanceof Error ? error.message : "Send failed" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

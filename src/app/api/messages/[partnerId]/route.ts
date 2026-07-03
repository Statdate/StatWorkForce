import { getApiUser } from "@/lib/dal";
import { getConversationForUser } from "@/lib/data/messages";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const { partnerId } = await params;

  try {
    const messages = await getConversationForUser(user, partnerId);
    return corsJson({ messages });
  } catch (error) {
    return corsJson({ error: error instanceof Error ? error.message : "Not found" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

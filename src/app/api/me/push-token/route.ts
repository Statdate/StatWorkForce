import { getApiUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** Mobile-only: called after login (and on app start if already signed in)
 * with the device's Expo push token. One token per user — the most recent
 * sign-in wins, matching how a single-phone worker actually uses this. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return corsJson({ error: "Expected a valid Expo push token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { expoPushToken: token },
  });

  return corsJson({ ok: true });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}

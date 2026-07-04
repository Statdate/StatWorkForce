import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sends an Expo push notification directly via Expo's push API (no
 * server-side Expo SDK needed for a single-shot request like this — it's a
 * plain POST). Failures are swallowed on purpose: a bad/expired token
 * shouldn't block the in-app Notification row from being created, and there's
 * no per-token retry queue in this deployment. Real production hardening
 * would parse Expo's per-ticket errors (DeviceNotRegistered, etc.) and clear
 * the stored token — noted in README as a follow-up.
 */
export async function sendPushToUser(userId: string, title: string, body: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });
  if (!user?.expoPushToken) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: user.expoPushToken,
        title,
        body,
        sound: "default",
      }),
    });
  } catch {
    // Best-effort — the in-app notification already exists regardless.
  }
}

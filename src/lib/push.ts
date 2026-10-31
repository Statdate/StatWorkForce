import "server-only";
import { prisma } from "@/lib/prisma";

const MAX_PUSH_ATTEMPTS = 5;
const CLAIM_TIMEOUT_MS = 5 * 60_000;

export function pushRetryDelayMs(attempt: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

type ExpoTicket = { status?: string; id?: string; message?: string; details?: { error?: string } };

export function parseExpoTicket(value: unknown): ExpoTicket {
  if (!value || typeof value !== "object") return {};
  const data = (value as { data?: unknown }).data;
  const ticket = Array.isArray(data) ? data[0] : data;
  return ticket && typeof ticket === "object" ? (ticket as ExpoTicket) : {};
}

/** Claims one outbox row before delivery so concurrent cron/web workers cannot
 * send it twice. A stale claim becomes eligible again after five minutes. */
export async function deliverPushNotification(notificationId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const claimed = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      pushAttempts: { lt: MAX_PUSH_ATTEMPTS },
      OR: [
        { pushStatus: { in: ["PENDING", "FAILED"] }, pushNextAttemptAt: { lte: now } },
        { pushStatus: "PROCESSING", pushLockedAt: { lt: staleBefore } },
      ],
    },
    data: { pushStatus: "PROCESSING", pushLockedAt: now, pushAttempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { user: { select: { expoPushToken: true } } },
  });
  if (!notification) return false;

  if (!notification.user.expoPushToken) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { pushStatus: "SKIPPED", pushLockedAt: null, pushLastError: "No registered push token" },
    });
    return true;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: notification.user.expoPushToken,
        title: notification.title,
        body: notification.body ?? "",
        sound: "default",
        data: notification.payload ?? undefined,
      }),
    });
    if (!response.ok) throw new Error(`Expo push service returned HTTP ${response.status}`);

    const ticket = parseExpoTicket(await response.json());
    if (ticket.status !== "ok") {
      const code = ticket.details?.error;
      const message = [code, ticket.message].filter(Boolean).join(": ") || "Expo rejected the push";
      if (code === "DeviceNotRegistered") {
        await prisma.$transaction([
          prisma.notification.update({
            where: { id: notificationId },
            data: { pushStatus: "SKIPPED", pushLockedAt: null, pushLastError: message.slice(0, 500) },
          }),
          prisma.user.update({ where: { id: notification.userId }, data: { expoPushToken: null } }),
        ]);
        return true;
      }
      throw new Error(message);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        pushStatus: "SENT",
        pushLockedAt: null,
        pushDeliveredAt: new Date(),
        pushTicketId: ticket.id ?? null,
        pushLastError: null,
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown push delivery error";
    const exhausted = notification.pushAttempts >= MAX_PUSH_ATTEMPTS;
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        pushStatus: "FAILED",
        pushLockedAt: null,
        pushNextAttemptAt: new Date(Date.now() + pushRetryDelayMs(notification.pushAttempts)),
        pushLastError: `${exhausted ? "Retry limit reached: " : ""}${message}`.slice(0, 500),
      },
    });
    return true;
  }
}

export async function processPendingPushNotifications(limit = 100) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const rows = await prisma.notification.findMany({
    where: {
      pushAttempts: { lt: MAX_PUSH_ATTEMPTS },
      OR: [
        { pushStatus: { in: ["PENDING", "FAILED"] }, pushNextAttemptAt: { lte: now } },
        { pushStatus: "PROCESSING", pushLockedAt: { lt: staleBefore } },
      ],
    },
    select: { id: true },
    orderBy: { pushNextAttemptAt: "asc" },
    take: Math.max(1, Math.min(limit, 500)),
  });
  const results = await Promise.all(rows.map(({ id }) => deliverPushNotification(id)));
  return results.filter(Boolean).length;
}

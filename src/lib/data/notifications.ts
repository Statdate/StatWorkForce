import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { credentialDisplayName, EXPIRING_SOON_MS } from "@/lib/credential-types";
import { sendPushToUser } from "@/lib/push";

/**
 * Creates the "credential expiring in 2 months" notifications for workers and
 * their unit managers. Idempotent: workerReminderSentAt/managerReminderSentAt
 * on the credential are set in the same transaction as the notification rows,
 * so re-running never duplicates.
 *
 * There's no background-job runner in this deployment, so this sweep runs
 * when notification surfaces load (worker/manager credential pages, the
 * notifications API). Cheap at current scale — hospital-wide it's one indexed
 * query plus writes only for newly-due credentials. Production-hardening note
 * in README: move to a daily cron.
 */
export async function ensureCredentialExpiryNotifications() {
  const cutoff = new Date(Date.now() + EXPIRING_SOON_MS);

  const due = await prisma.credential.findMany({
    where: {
      expirationDate: { lte: cutoff },
      OR: [{ workerReminderSentAt: null }, { managerReminderSentAt: null }],
      user: { accountType: "WORKER", isActive: true },
    },
    select: {
      id: true,
      type: true,
      customName: true,
      expirationDate: true,
      workerReminderSentAt: true,
      managerReminderSentAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          badgeNumber: true,
          unitMemberships: { select: { unitId: true } },
        },
      },
    },
  });

  for (const credential of due) {
    const name = credentialDisplayName(credential);
    const expired = credential.expirationDate.getTime() < Date.now();
    const dateText = credential.expirationDate.toLocaleDateString("en-US");
    const workerName = `${credential.user.firstName} ${credential.user.lastName}`;

    const now = new Date();
    const ops = [];
    // Push sends happen after the transaction commits (they're an external
    // HTTP call, not something that belongs inside a DB transaction) — queued
    // here alongside the matching Notification row.
    const pushSends: { userId: string; title: string; body: string }[] = [];

    if (!credential.workerReminderSentAt) {
      const title = expired ? `Your ${name} has expired` : `Your ${name} expires on ${dateText}`;
      const body = expired
        ? `It expired on ${dateText}. Renew it and upload the new document.`
        : "Renew it before then and upload the new document.";
      ops.push(
        prisma.notification.create({
          data: {
            userId: credential.user.id,
            type: "CREDENTIAL_EXPIRING_WORKER",
            title,
            body,
            payload: { credentialId: credential.id },
          },
        })
      );
      pushSends.push({ userId: credential.user.id, title, body });
    }

    if (!credential.managerReminderSentAt) {
      const unitIds = credential.user.unitMemberships.map((m) => m.unitId);
      const managers = unitIds.length
        ? await prisma.user.findMany({
            where: {
              accountType: "MANAGER",
              isActive: true,
              unitMemberships: { some: { unitId: { in: unitIds } } },
            },
            select: { id: true },
          })
        : [];
      for (const manager of managers) {
        const title = expired
          ? `${workerName}'s ${name} has expired`
          : `${workerName}'s ${name} expires on ${dateText}`;
        const body = `Badge #${credential.user.badgeNumber}. See the unit credentials page for the full list.`;
        ops.push(
          prisma.notification.create({
            data: {
              userId: manager.id,
              type: "CREDENTIAL_EXPIRING_MANAGER",
              title,
              body,
              payload: { credentialId: credential.id, workerId: credential.user.id },
            },
          })
        );
        pushSends.push({ userId: manager.id, title, body });
      }
    }

    ops.push(
      prisma.credential.update({
        where: { id: credential.id },
        data: {
          ...(credential.workerReminderSentAt ? {} : { workerReminderSentAt: now }),
          ...(credential.managerReminderSentAt ? {} : { managerReminderSentAt: now }),
        },
      })
    );

    await prisma.$transaction(ops);
    await Promise.all(pushSends.map((p) => sendPushToUser(p.userId, p.title, p.body)));
  }
}

/** Core variant for API routes (mobile) — see getScheduleForUser() for the
 * pattern. Returns notifications with their pre-read state so callers can
 * style unread rows, then optionally marks everything read. */
export async function getNotificationsForUser(
  userId: string,
  { markRead = false }: { markRead?: boolean } = {}
) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  if (markRead && notifications.some((n) => !n.readAt)) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return notifications;
}

export async function getMyNotifications(options: { markRead?: boolean } = {}) {
  const user = await getCurrentUser();
  return getNotificationsForUser(user.id, options);
}

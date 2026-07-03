import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole, scopedUnitIds, type CurrentUser } from "@/lib/dal";

type ThreadPartner = { id: string; firstName: string; lastName: string };

/** Manager<->worker messaging only (per spec: managers message "their staff").
 * Both directions require the pair to share a unit. Takes an already-resolved
 * user so mobile API routes can pass in getApiUser()'s result instead of the
 * redirect-on-miss getCurrentUser(). */
async function assertCanMessageAsUser(user: CurrentUser, otherUserId: string) {
  if (user.id === otherUserId) throw new Error("Can't message yourself");

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, accountType: true, unitMemberships: { select: { unitId: true } } },
  });
  if (!other) throw new Error("Recipient not found");

  const myUnitIds = user.unitMemberships.map((m) => m.unitId);
  const otherUnitIds = other.unitMemberships.map((m) => m.unitId);
  const sharesUnit = myUnitIds.some((id) => otherUnitIds.includes(id));

  const validPair =
    (user.accountType === "MANAGER" && other.accountType === "WORKER") ||
    (user.accountType === "WORKER" && other.accountType === "MANAGER");

  if (!validPair || !sharesUnit) {
    throw new Error("You can only message your own unit's manager or staff");
  }

  return { user, other };
}

export async function getConversation(otherUserId: string) {
  const user = await getCurrentUser();
  return getConversationForUser(user, otherUserId);
}

/** Core logic split from getConversation() — see assertCanMessageAsUser(). */
export async function getConversationForUser(user: CurrentUser, otherUserId: string) {
  await assertCanMessageAsUser(user, otherUserId);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: user.id },
      ],
    },
    orderBy: { sentAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { senderId: otherUserId, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return messages;
}

export async function sendMessage(recipientId: string, body: string) {
  const user = await getCurrentUser();
  return sendMessageAsUser(user, recipientId, body);
}

/** Core logic split from sendMessage() — see assertCanMessageAsUser(). */
export async function sendMessageAsUser(user: CurrentUser, recipientId: string, body: string) {
  await assertCanMessageAsUser(user, recipientId);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty");

  await prisma.message.create({
    data: { senderId: user.id, recipientId, body: trimmed },
  });
}

/** Manager: their unit's workers. Worker: the manager(s) of their unit(s).
 * Each partner comes back with a count of unread messages from them. */
export async function getMessageThreads() {
  const user = await getCurrentUser();
  return getMessageThreadsForUser(user);
}

/** Core logic split from getMessageThreads() — see assertCanMessageAsUser(). */
export async function getMessageThreadsForUser(user: CurrentUser) {
  const unitIds = scopedUnitIds(user) ?? [];
  if (unitIds.length === 0 || (user.accountType !== "MANAGER" && user.accountType !== "WORKER")) {
    return [];
  }

  const partnerAccountType = user.accountType === "MANAGER" ? "WORKER" : "MANAGER";
  const memberships = await prisma.unitMembership.findMany({
    where: { unitId: { in: unitIds }, user: { accountType: partnerAccountType } },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    distinct: ["userId"],
  });

  const partners = memberships.map((m) => m.user);
  return withUnreadCounts(user.id, partners);
}

/** Manager view of a specific unit's workers (scoped to that one unit, unlike
 * getMessageThreads which spans every unit the manager is assigned to). */
export async function getUnitMessageThreads(unitId: string) {
  const user = await requireRole("MANAGER", "ADMIN");
  const allowed = scopedUnitIds(user);
  if (allowed !== null && !allowed.includes(unitId)) {
    throw new Error(`Unit ${unitId} is not in the current manager's scope`);
  }

  const memberships = await prisma.unitMembership.findMany({
    where: { unitId, user: { accountType: "WORKER" } },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    distinct: ["userId"],
  });

  return withUnreadCounts(user.id, memberships.map((m) => m.user));
}

async function withUnreadCounts(myUserId: string, partners: ThreadPartner[]) {
  const unread = await prisma.message.findMany({
    where: {
      recipientId: myUserId,
      readAt: null,
      senderId: { in: partners.map((p) => p.id) },
    },
    select: { senderId: true },
  });

  const countMap = new Map<string, number>();
  for (const m of unread) {
    countMap.set(m.senderId, (countMap.get(m.senderId) ?? 0) + 1);
  }

  return partners.map((p) => ({ ...p, unreadCount: countMap.get(p.id) ?? 0 }));
}

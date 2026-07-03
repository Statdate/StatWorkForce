import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole, scopedUnitIds } from "@/lib/dal";

class ForbiddenUnitError extends Error {
  constructor(unitId: string) {
    super(`Unit ${unitId} is not in the current manager's scope`);
    this.name = "ForbiddenUnitError";
  }
}

/** Throws if `unitId` isn't one of the manager's assigned units. Never trust a client-supplied unitId without this. */
async function assertUnitInScope(unitId: string) {
  const user = await requireRole("MANAGER", "ADMIN");
  const allowed = scopedUnitIds(user);
  if (allowed !== null && !allowed.includes(unitId)) {
    throw new ForbiddenUnitError(unitId);
  }
  return user;
}

/** Units the current manager is assigned to. Admins get all units in their hospital. */
export async function getManagerUnits() {
  const user = await requireRole("MANAGER", "ADMIN");

  if (user.accountType === "ADMIN") {
    return prisma.unit.findMany({
      where: { hospitalId: user.hospitalId },
      orderBy: { name: "asc" },
    });
  }

  const unitIds = scopedUnitIds(user) ?? [];
  return prisma.unit.findMany({
    where: { id: { in: unitIds } },
    orderBy: { name: "asc" },
  });
}

/** Shifts + fill counts for a unit's current schedule period (census view). */
export async function getUnitCensus(unitId: string, from: Date, to: Date) {
  await assertUnitInScope(unitId);

  const shifts = await prisma.shift.findMany({
    where: { unitId, startTime: { gte: from, lt: to } },
    include: {
      jobType: { select: { name: true } },
      assignments: {
        where: { status: { not: "DROPPED" } },
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return shifts.map((shift) => ({
    ...shift,
    filledCount: shift.assignments.length,
    isUnderstaffed: shift.assignments.length < shift.requiredCount,
    isOverstaffed: shift.assignments.length > shift.requiredCount,
  }));
}

/** Pending timecard entries awaiting manager approval, scoped to the manager's units. */
export async function getApprovalQueue(unitId: string) {
  await assertUnitInScope(unitId);

  return prisma.timeEntry.findMany({
    where: {
      approvalStatus: "PENDING",
      user: { unitMemberships: { some: { unitId } } },
    },
    include: { user: { select: { firstName: true, lastName: true, badgeNumber: true } } },
    orderBy: { timestamp: "asc" },
  });
}

/** Approve or reject a timecard entry. Scoped by checking the entry's owner
 * shares a unit with the manager — the entry itself doesn't carry a unitId
 * since TimeEntry can be standalone (not tied to a Shift). */
export async function setTimeEntryApproval(
  timeEntryId: string,
  approvalStatus: "APPROVED" | "REJECTED"
) {
  const user = await requireRole("MANAGER", "ADMIN");
  const allowedUnitIds = scopedUnitIds(user);

  const entry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: { user: { select: { unitMemberships: { select: { unitId: true } } } } },
  });
  if (!entry) throw new Error("Time entry not found");

  if (allowedUnitIds !== null) {
    const entryUnitIds = entry.user.unitMemberships.map((m) => m.unitId);
    const inScope = entryUnitIds.some((id) => allowedUnitIds.includes(id));
    if (!inScope) throw new Error(`Timecard owner is not in the current manager's scope`);
  }

  await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { approvalStatus, approvedById: user.id, approvedAt: new Date() },
  });
}

export async function getUnitStaff(unitId: string) {
  await assertUnitInScope(unitId);

  return prisma.unitMembership.findMany({
    where: { unitId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, accountType: true, jobType: true },
      },
      priorityGroup: true,
    },
    orderBy: { user: { lastName: "asc" } },
  });
}

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

/** Schedule periods for a unit, most recent first — the draft/published gate
 * behind "sync to calendar" (only published shifts are meant to be synced). */
export async function getSchedulePeriods(unitId: string) {
  await assertUnitInScope(unitId);

  return prisma.schedulePeriod.findMany({
    where: { unitId },
    include: { publishedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function publishSchedulePeriod(schedulePeriodId: string) {
  const user = await requireRole("MANAGER", "ADMIN");

  const period = await prisma.schedulePeriod.findUnique({ where: { id: schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");

  const allowedUnitIds = scopedUnitIds(user);
  if (allowedUnitIds !== null && !allowedUnitIds.includes(period.unitId)) {
    throw new Error(`Unit ${period.unitId} is not in the current manager's scope`);
  }

  await prisma.schedulePeriod.update({
    where: { id: schedulePeriodId },
    data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: user.id },
  });
}

export async function getUnitStaff(unitId: string) {
  await assertUnitInScope(unitId);

  return prisma.unitMembership.findMany({
    where: { unitId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, accountType: true, jobType: true, title: true },
      },
      priorityGroup: true,
    },
    orderBy: { user: { lastName: "asc" } },
  });
}

/** Compiled credential list for every worker in the unit, soonest expiration
 * first — the manager's "what needs attention" view. Workers with nothing on
 * file are listed separately so gaps are visible, not silent. */
export async function getUnitCredentials(unitId: string) {
  await assertUnitInScope(unitId);

  const [credentials, workersWithoutCredentials] = await Promise.all([
    prisma.credential.findMany({
      where: { user: { accountType: "WORKER", unitMemberships: { some: { unitId } } } },
      omit: { fileData: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.user.findMany({
      where: {
        accountType: "WORKER",
        unitMemberships: { some: { unitId } },
        credentials: { none: {} },
      },
      select: { id: true, firstName: true, lastName: true, badgeNumber: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  return { credentials, workersWithoutCredentials };
}

/** Pending-first time-off requests for every worker in the unit — the
 * manager's action queue. Requests already decided are included after, so
 * history is visible without a separate page. */
export async function getUnitTimeOffRequests(unitId: string) {
  await assertUnitInScope(unitId);

  const requests = await prisma.timeOffRequest.findMany({
    where: { user: { accountType: "WORKER", unitMemberships: { some: { unitId } } } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  });

  return requests;
}

/** Approve or deny a worker's time-off request. On approval, any of that
 * worker's active shift assignments inside [startDate, endDate] are released
 * back to open shifts — this is the replacement for self-service cancel:
 * the shift only actually gets dropped once a manager signs off. */
export async function reviewTimeOffRequest(
  requestId: string,
  decision: "APPROVED" | "DENIED"
) {
  const manager = await requireRole("MANAGER", "ADMIN");
  const allowedUnitIds = scopedUnitIds(manager);

  const request = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, unitMemberships: { select: { unitId: true } } } } },
  });
  if (!request) throw new Error("Time off request not found");
  if (request.status !== "PENDING") throw new Error("This request was already reviewed");

  if (allowedUnitIds !== null) {
    const requesterUnitIds = request.user.unitMemberships.map((m) => m.unitId);
    const inScope = requesterUnitIds.some((id) => allowedUnitIds.includes(id));
    if (!inScope) throw new Error("Requester is not in the current manager's scope");
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeOffRequest.update({
      where: { id: requestId },
      data: { status: decision, reviewedAt: new Date(), reviewedById: manager.id },
    });

    if (decision === "APPROVED") {
      // endDate is stored as local midnight of the last day — use an
      // exclusive upper bound one day later so shifts starting later that
      // same day are still caught, not just ones before midnight.
      const rangeEnd = new Date(request.endDate.getTime() + 24 * 60 * 60 * 1000);
      await tx.scheduleAssignment.updateMany({
        where: {
          userId: request.userId,
          status: { in: ["SELF_SCHEDULED", "MANAGER_ASSIGNED", "APPROVED"] },
          shift: { startTime: { gte: request.startDate, lt: rangeEnd } },
        },
        data: { status: "DROPPED" },
      });
    }
  });
}

/** Toggle whether a schedule period is open for workers to submit their
 * requested days — independent of the DRAFT/PUBLISHED status, which governs
 * the actual built shift schedule, not the request-taking phase. */
export async function setScheduleRequestWindow(schedulePeriodId: string, open: boolean) {
  const user = await requireRole("MANAGER", "ADMIN");

  const period = await prisma.schedulePeriod.findUnique({ where: { id: schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");

  const allowedUnitIds = scopedUnitIds(user);
  if (allowedUnitIds !== null && !allowedUnitIds.includes(period.unitId)) {
    throw new Error(`Unit ${period.unitId} is not in the current manager's scope`);
  }

  await prisma.schedulePeriod.update({
    where: { id: schedulePeriodId },
    data: { requestsOpen: open },
  });
}

/** Submitted schedule requests for a period, worker's priority group
 * attached so the manager's review view can label/highlight by tier. */
export async function getScheduleRequestsForPeriod(schedulePeriodId: string) {
  const period = await prisma.schedulePeriod.findUnique({ where: { id: schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");
  await assertUnitInScope(period.unitId);

  const requests = await prisma.scheduleRequest.findMany({
    where: { schedulePeriodId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          badgeNumber: true,
          unitMemberships: {
            where: { unitId: period.unitId },
            select: { priorityGroup: { select: { id: true, name: true, rank: true } } },
          },
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Soonest-priority (lowest rank) first, unranked last — matches how a
  // manager actually works down the list when building the schedule.
  return requests
    .map((r) => ({
      ...r,
      priorityGroup: r.user.unitMemberships[0]?.priorityGroup ?? null,
    }))
    .sort((a, b) => (a.priorityGroup?.rank ?? Infinity) - (b.priorityGroup?.rank ?? Infinity));
}

/** Manager "releases" a new 6-week schedule period for workers to submit
 * requested days into — creates the period (DRAFT, not yet built/published)
 * with requestsOpen already true, so there's one action instead of two. */
export async function createScheduleRequestWindow(unitId: string, startDate: string) {
  const user = await requireRole("MANAGER", "ADMIN");
  const allowedUnitIds = scopedUnitIds(user);
  if (allowedUnitIds !== null && !allowedUnitIds.includes(unitId)) {
    throw new Error(`Unit ${unitId} is not in the current manager's scope`);
  }

  const start = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? new Date(`${startDate}T00:00:00`)
    : new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Enter a valid start date.");
  }
  const end = new Date(start.getTime() + 42 * 24 * 60 * 60 * 1000); // 6 weeks

  const existing = await prisma.schedulePeriod.findUnique({
    where: { unitId_startDate_endDate: { unitId, startDate: start, endDate: end } },
  });
  if (existing) {
    throw new Error("A schedule period for that exact 6-week span already exists.");
  }

  return prisma.schedulePeriod.create({
    data: { unitId, startDate: start, endDate: end, status: "DRAFT", requestsOpen: true },
  });
}

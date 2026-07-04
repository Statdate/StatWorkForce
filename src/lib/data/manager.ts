import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, scopedUnitIds, type CurrentUser } from "@/lib/dal";
import { sendPushToUser } from "@/lib/push";

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

/** All unit IDs a manager/admin is scoped to — unlike scopedUnitIds(), never
 * null: admins (unscoped) get every unit in their hospital. Mobile has no
 * per-unit navigation like web's [unitId] pages, so its aggregated views
 * need one concrete list to query across. */
async function allScopedUnitIds(user: CurrentUser): Promise<string[]> {
  const scoped = scopedUnitIds(user);
  if (scoped !== null) return scoped;
  const units = await prisma.unit.findMany({
    where: { hospitalId: user.hospitalId },
    select: { id: true },
  });
  return units.map((u) => u.id);
}

// getManagerUnits() backs the unit-switcher nav shown on every manager page
// (dashboard, credentials, messages, time-off) — it was re-querying the same
// rarely-changing unit list on every single navigation. Cached for 5 minutes,
// keyed by the resolved hospitalId/unitIds (never by the raw session — the
// auth check itself stays outside the cached scope, since cookies() can't be
// read inside one).
const getCachedUnitsForHospital = unstable_cache(
  async (hospitalId: string) =>
    prisma.unit.findMany({ where: { hospitalId }, orderBy: { name: "asc" } }),
  ["units-for-hospital"],
  { revalidate: 300 }
);

const getCachedUnitsByIds = unstable_cache(
  async (unitIds: string[]) =>
    prisma.unit.findMany({ where: { id: { in: unitIds } }, orderBy: { name: "asc" } }),
  ["units-by-ids"],
  { revalidate: 300 }
);

/** Units the current manager is assigned to. Admins get all units in their hospital. */
export async function getManagerUnits() {
  const user = await requireRole("MANAGER", "ADMIN");

  if (user.accountType === "ADMIN") {
    return getCachedUnitsForHospital(user.hospitalId);
  }

  const unitIds = scopedUnitIds(user) ?? [];
  return getCachedUnitsByIds(unitIds);
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

/** Workers who've self-scheduled onto an open shift but haven't been approved
 * yet — SELF_SCHEDULED already counts toward the shift's filled count (so no
 * one else can also grab it), but a manager needs to sign off before it's
 * final. This is what keeps a pickup from silently accruing overtime. */
export async function getPendingShiftPickups(unitId: string) {
  await assertUnitInScope(unitId);

  return prisma.scheduleAssignment.findMany({
    where: { status: "SELF_SCHEDULED", shift: { unitId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      shift: { select: { startTime: true, endTime: true, jobType: { select: { name: true } } } },
    },
    orderBy: { signedUpAt: "asc" },
  });
}

/** Approve or reject a pending shift pickup. Rejecting drops the assignment
 * (AssignmentStatus.DROPPED) so the shift goes back to the open-shifts list
 * instead of leaving a phantom "rejected" row blocking the slot. */
export async function setShiftPickupApproval(assignmentId: string, decision: "APPROVED" | "DENIED") {
  const user = await requireRole("MANAGER", "ADMIN");
  const allowedUnitIds = scopedUnitIds(user);

  const assignment = await prisma.scheduleAssignment.findUnique({
    where: { id: assignmentId },
    include: { shift: { select: { unitId: true, startTime: true, endTime: true } }, user: { select: { id: true } } },
  });
  if (!assignment) throw new Error("Shift pickup not found");
  if (assignment.status !== "SELF_SCHEDULED") throw new Error("This pickup was already reviewed");

  if (allowedUnitIds !== null && !allowedUnitIds.includes(assignment.shift.unitId)) {
    throw new Error(`Unit ${assignment.shift.unitId} is not in the current manager's scope`);
  }

  await prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    data:
      decision === "APPROVED"
        ? { status: "APPROVED", approvedById: user.id, approvedAt: new Date() }
        : { status: "DROPPED" },
  });

  const shiftDate = assignment.shift.startTime.toLocaleDateString();
  const title =
    decision === "APPROVED"
      ? `Your shift pickup for ${shiftDate} was approved`
      : `Your shift pickup for ${shiftDate} was not approved`;
  await prisma.notification.create({
    data: {
      userId: assignment.user.id,
      type: "SHIFT_PICKUP_DECIDED",
      title,
      body:
        decision === "DENIED"
          ? "The shift is back in Open Shifts for someone else to pick up."
          : null,
    },
  });
  await sendPushToUser(assignment.user.id, title, decision === "DENIED" ? "Check Open Shifts for other options." : "");
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
  const user = await assertUnitInScope(unitId);
  return getUnitCredentialsForManager(user, [unitId]);
}

/** Same as getUnitCredentials(), but across every unit a manager/admin is
 * scoped to (or the given subset) — mobile has no per-unit navigation like
 * web's [unitId] pages, so its Credentials tab shows one combined
 * expiration overview instead. */
export async function getUnitCredentialsForManager(manager: CurrentUser, unitIds?: string[]) {
  const scoped = unitIds ?? (await allScopedUnitIds(manager));
  if (scoped.length === 0) return { credentials: [], workersWithoutCredentials: [] };

  const [credentials, workersWithoutCredentials] = await Promise.all([
    prisma.credential.findMany({
      where: { user: { accountType: "WORKER", unitMemberships: { some: { unitId: { in: scoped } } } } },
      omit: { fileData: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.user.findMany({
      where: {
        accountType: "WORKER",
        unitMemberships: { some: { unitId: { in: scoped } } },
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
  const user = await assertUnitInScope(unitId);
  return getUnitTimeOffRequestsForManager(user, [unitId]);
}

/** Same as getUnitTimeOffRequests(), but across every unit a manager/admin is
 * scoped to (or the given subset) — mobile's approval queue has no per-unit
 * navigation like web's [unitId] pages, so it shows one combined queue. */
export async function getUnitTimeOffRequestsForManager(manager: CurrentUser, unitIds?: string[]) {
  const scoped = unitIds ?? (await allScopedUnitIds(manager));
  if (scoped.length === 0) return [];

  return prisma.timeOffRequest.findMany({
    where: { user: { accountType: "WORKER", unitMemberships: { some: { unitId: { in: scoped } } } } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      reviewedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  });
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
  return reviewTimeOffRequestForManager(manager, requestId, decision);
}

/** Same as reviewTimeOffRequest(), but takes an already-resolved manager
 * instead of calling requireRole() itself, so mobile's API route (which
 * resolves the user from a Bearer token, not cookies) can call it. */
export async function reviewTimeOffRequestForManager(
  manager: CurrentUser,
  requestId: string,
  decision: "APPROVED" | "DENIED"
) {
  if (manager.accountType !== "MANAGER" && manager.accountType !== "ADMIN") {
    throw new Error("Only managers can review time off requests");
  }
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

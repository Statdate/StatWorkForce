import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, scopedUnitIds, type CurrentUser } from "@/lib/dal";
import { deliverPushNotification } from "@/lib/push";
import { checkAssignmentSafety, withSchedulingTransaction } from "@/lib/schedule-assignment";
import {
  addDaysToLocalDate,
  durationHours,
  localDateTimeToUtc,
  scheduledHoursInWindow,
  workWeek,
} from "@/lib/scheduling-rules";
import { recordAuditEvent } from "@/lib/audit";
import { canManageUnit } from "@/lib/authorization";

class ForbiddenUnitError extends Error {
  constructor(unitId: string) {
    super(`Unit ${unitId} is not in the current manager's scope`);
    this.name = "ForbiddenUnitError";
  }
}

/** Enforces both tenant and role scope for a unit. `ADMIN` means all units
 * in the current hospital, never all units in the database. */
async function assertUnitForManager(user: CurrentUser, unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, hospitalId: true },
  });
  if (
    !unit ||
    !canManageUnit(
      {
        accountType: user.accountType,
        hospitalId: user.hospitalId,
        unitIds: user.unitMemberships.map((membership) => membership.unitId),
      },
      unit
    )
  ) {
    throw new ForbiddenUnitError(unitId);
  }
  return unit;
}

/** Throws if `unitId` isn't one of the manager's assigned units. Never trust a client-supplied unitId without this. */
async function assertUnitInScope(unitId: string) {
  const user = await requireRole("MANAGER", "ADMIN");
  await assertUnitForManager(user, unitId);
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
  const user = await assertUnitInScope(unitId);
  return getUnitScheduleForManager(user, from, to, [unitId]);
}

/** Same as getUnitCensus(), but across every unit a manager/admin is scoped
 * to (or the given subset) — mobile's Unit Schedule calendar has no
 * per-unit navigation like web's [unitId] pages, so it shows one combined
 * view. Assignments carry full user info (not just a count) so the mobile
 * UI can list who's covering a shift and who's still requested/pending
 * without a second round trip. */
export async function getUnitScheduleForManager(
  manager: CurrentUser,
  from: Date,
  to: Date,
  unitIds?: string[]
) {
  const scoped = unitIds ?? (await allScopedUnitIds(manager));
  if (scoped.length === 0) return [];

  if (unitIds) {
    await Promise.all(unitIds.map((unitId) => assertUnitForManager(manager, unitId)));
  }

  const shifts = await prisma.shift.findMany({
    where: { unitId: { in: scoped }, startTime: { gte: from, lt: to } },
    include: {
      unit: { select: { id: true, name: true } },
      jobType: { select: { id: true, name: true } },
      schedulePeriod: { select: { status: true } },
      assignments: {
        where: { status: { not: "DROPPED" } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
        },
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

/** Workers (not other managers) assigned to a unit — the candidate list for
 * offerShiftToWorker()'s "offer this shift to" picker. */
export async function getUnitWorkersForManager(
  manager: CurrentUser,
  unitId: string,
  jobTypeId: string
) {
  await assertUnitForManager(manager, unitId);

  return prisma.user.findMany({
    where: {
      accountType: "WORKER",
      jobTypeId,
      unitMemberships: { some: { unitId } },
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, badgeNumber: true },
    orderBy: { lastName: "asc" },
  });
}

/** Directly assign a shift to a specific worker (AssignmentStatus.MANAGER_ASSIGNED)
 * — unlike a self-scheduled pickup, this doesn't need a second approval step
 * since the manager is the one initiating it. Upserts so re-offering (or
 * offering a shift the worker already picked up) just updates the status. */
export async function offerShiftToWorker(manager: CurrentUser, shiftId: string, workerId: string) {
  if (manager.accountType !== "MANAGER" && manager.accountType !== "ADMIN") {
    throw new Error("Only managers can offer shifts");
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { unit: { select: { hospitalId: true } } },
  });
  if (!shift) throw new Error("Shift not found");
  await assertUnitForManager(manager, shift.unitId);

  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    select: { id: true, hospitalId: true, accountType: true, isActive: true, jobTypeId: true, unitMemberships: { select: { unitId: true } } },
  });
  if (!worker || !worker.isActive || worker.hospitalId !== manager.hospitalId || worker.accountType !== "WORKER") {
    throw new Error("Worker not found");
  }
  if (!worker.unitMemberships.some((m) => m.unitId === shift.unitId)) {
    throw new Error("That worker isn't assigned to this shift's unit");
  }
  if (!worker.jobTypeId || worker.jobTypeId !== shift.jobTypeId) {
    throw new Error("That worker does not have the job qualification required for this shift");
  }

  const shiftDate = shift.startTime.toLocaleDateString();
  const title = `You've been offered a shift on ${shiftDate}`;
  const notificationId = await withSchedulingTransaction(async (tx) => {
    const safety = await checkAssignmentSafety(tx, { userId: workerId, shiftId });
    const assignment = await tx.scheduleAssignment.upsert({
      where: { shiftId_userId: { shiftId, userId: workerId } },
      update: { status: "MANAGER_ASSIGNED" },
      create: { shiftId, userId: workerId, status: "MANAGER_ASSIGNED" },
    });
    const workload = safety.workloadWarning
      ? ` This assignment brings your scheduled workload to ${safety.projectedHours.toFixed(1)} hours this week.`
      : "";
    const notification = await tx.notification.create({
      data: { userId: workerId, type: "GENERAL", title, body: `Check My Schedule for details.${workload}` },
    });
    await recordAuditEvent(
      {
        hospitalId: manager.hospitalId,
        actorId: manager.id,
        action: "SHIFT_ASSIGNED",
        resourceType: "ScheduleAssignment",
        resourceId: assignment.id,
        metadata: { shiftId, workerId, unitId: shift.unitId, projectedWeeklyHours: safety.projectedHours },
      },
      tx
    );
    return notification.id;
  });
  await deliverPushNotification(notificationId);
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
    include: { user: { select: { hospitalId: true, unitMemberships: { select: { unitId: true } } } } },
  });
  if (!entry) throw new Error("Time entry not found");
  if (entry.user.hospitalId !== user.hospitalId) throw new Error("Time entry not found");

  if (allowedUnitIds !== null) {
    const entryUnitIds = entry.user.unitMemberships.map((m) => m.unitId);
    const inScope = entryUnitIds.some((id) => allowedUnitIds.includes(id));
    if (!inScope) throw new Error(`Timecard owner is not in the current manager's scope`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: timeEntryId },
      data: { approvalStatus, approvedById: user.id, approvedAt: new Date() },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "TIME_ENTRY_REVIEWED",
        resourceType: "TimeEntry",
        resourceId: timeEntryId,
        metadata: { decision: approvalStatus },
      },
      tx
    );
  });
}

/** Workers who've self-scheduled onto an open shift but haven't been approved
 * yet — SELF_SCHEDULED already counts toward the shift's filled count (so no
 * one else can also grab it), but a manager needs to sign off before it's
 * final. This is what keeps a pickup from silently accruing overtime. */
export async function getPendingShiftPickups(unitId: string) {
  const manager = await assertUnitInScope(unitId);

  const pickups = await prisma.scheduleAssignment.findMany({
    where: { status: "SELF_SCHEDULED", shift: { unitId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
      shift: { select: { startTime: true, endTime: true, jobType: { select: { name: true } } } },
    },
    orderBy: { signedUpAt: "asc" },
  });
  if (pickups.length === 0) return [];

  const windows = pickups.map(({ shift }) =>
    workWeek(shift.startTime, manager.hospital.timeZone, manager.hospital.weekStartsOn)
  );
  const rangeStart = new Date(Math.min(...windows.map(({ start }) => start.getTime())));
  const rangeEnd = new Date(Math.max(...windows.map(({ end }) => end.getTime())));
  const assignments = await prisma.scheduleAssignment.findMany({
    where: {
      userId: { in: [...new Set(pickups.map(({ userId }) => userId))] },
      status: { not: "DROPPED" },
      shift: { startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
    },
    select: { userId: true, shiftId: true, shift: { select: { startTime: true, endTime: true } } },
  });

  return pickups.map((pickup) => {
    const week = workWeek(
      pickup.shift.startTime,
      manager.hospital.timeZone,
      manager.hospital.weekStartsOn
    );
    const existing = assignments
      .filter(({ userId, shiftId }) => userId === pickup.userId && shiftId !== pickup.shiftId)
      .map(({ shift }) => shift);
    const projectedHours =
      scheduledHoursInWindow(existing, week) + durationHours(pickup.shift);
    return {
      ...pickup,
      projectedHours,
      workloadWarning: projectedHours > manager.hospital.weeklyHoursWarning,
      workloadWarningThreshold: manager.hospital.weeklyHoursWarning,
    };
  });
}

/** Approve or reject a pending shift pickup. Rejecting drops the assignment
 * (AssignmentStatus.DROPPED) so the shift goes back to the open-shifts list
 * instead of leaving a phantom "rejected" row blocking the slot. */
export async function setShiftPickupApproval(assignmentId: string, decision: "APPROVED" | "DENIED") {
  const user = await requireRole("MANAGER", "ADMIN");
  return setShiftPickupApprovalForManager(user, assignmentId, decision);
}

/** Same as setShiftPickupApproval(), but takes an already-resolved manager
 * instead of calling requireRole() itself, so mobile's API route (which
 * resolves the user from a Bearer token, not cookies) can call it. */
export async function setShiftPickupApprovalForManager(
  user: CurrentUser,
  assignmentId: string,
  decision: "APPROVED" | "DENIED"
) {
  if (user.accountType !== "MANAGER" && user.accountType !== "ADMIN") {
    throw new Error("Only managers can review shift pickups");
  }
  const assignment = await prisma.scheduleAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      shift: { select: { unitId: true, startTime: true, endTime: true } },
      user: { select: { id: true, hospitalId: true } },
    },
  });
  if (!assignment) throw new Error("Shift pickup not found");
  if (assignment.status !== "SELF_SCHEDULED") throw new Error("This pickup was already reviewed");
  if (assignment.user.hospitalId !== user.hospitalId) throw new Error("Shift pickup not found");
  await assertUnitForManager(user, assignment.shift.unitId);

  const shiftDate = assignment.shift.startTime.toLocaleDateString();
  const title =
    decision === "APPROVED"
      ? `Your shift pickup for ${shiftDate} was approved`
      : `Your shift pickup for ${shiftDate} was not approved`;
  const notificationId = await withSchedulingTransaction(async (tx) => {
    if (decision === "APPROVED") {
      await checkAssignmentSafety(tx, { userId: assignment.user.id, shiftId: assignment.shiftId });
    }
    await tx.scheduleAssignment.update({
      where: { id: assignmentId },
      data:
        decision === "APPROVED"
          ? { status: "APPROVED", approvedById: user.id, approvedAt: new Date() }
          : { status: "DROPPED" },
    });
    const notification = await tx.notification.create({
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
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "SHIFT_PICKUP_REVIEWED",
        resourceType: "ScheduleAssignment",
        resourceId: assignmentId,
        metadata: { decision, unitId: assignment.shift.unitId },
      },
      tx
    );
    return notification.id;
  });
  await deliverPushNotification(notificationId);
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

export async function getManagerJobTypes() {
  const user = await requireRole("MANAGER", "ADMIN");
  return prisma.jobType.findMany({
    where: { hospitalId: user.hospitalId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createShift(input: {
  unitId: string;
  schedulePeriodId: string;
  jobTypeId: string;
  startLocal: string;
  endLocal: string;
  requiredCount: number;
  notes?: string;
}) {
  const user = await requireRole("MANAGER", "ADMIN");
  await assertUnitForManager(user, input.unitId);
  const requiredCount = Number(input.requiredCount);
  if (!Number.isInteger(requiredCount) || requiredCount < 1 || requiredCount > 100) {
    throw new Error("Required staff must be between 1 and 100");
  }
  const [period, jobType] = await Promise.all([
    prisma.schedulePeriod.findFirst({
      where: { id: input.schedulePeriodId, unitId: input.unitId, status: "DRAFT" },
      select: { id: true, startDate: true, endDate: true },
    }),
    prisma.jobType.findFirst({
      where: { id: input.jobTypeId, hospitalId: user.hospitalId },
      select: { id: true },
    }),
  ]);
  if (!period) throw new Error("Select a draft schedule period for this unit");
  if (!jobType) throw new Error("Select a valid job type");
  const startTime = localDateTimeToUtc(input.startLocal, user.hospital.timeZone);
  const endTime = localDateTimeToUtc(input.endLocal, user.hospital.timeZone);
  if (endTime <= startTime) throw new Error("Shift end must be after its start");
  if (endTime.getTime() - startTime.getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("A shift cannot exceed 24 hours");
  }
  if (startTime < period.startDate || endTime > period.endDate) {
    throw new Error("Shift times must fall within the selected schedule period");
  }
  const notes = input.notes?.trim().slice(0, 500) || null;
  return prisma.$transaction(async (tx) => {
    const shift = await tx.shift.create({
      data: {
        unitId: input.unitId,
        schedulePeriodId: period.id,
        jobTypeId: jobType.id,
        startTime,
        endTime,
        requiredCount,
        notes,
      },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "SHIFT_CREATED",
        resourceType: "Shift",
        resourceId: shift.id,
        metadata: {
          unitId: input.unitId,
          schedulePeriodId: period.id,
          jobTypeId: jobType.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          requiredCount,
        },
      },
      tx
    );
    return shift.id;
  });
}

export async function updateDraftShift(input: {
  shiftId: string;
  unitId: string;
  jobTypeId: string;
  startLocal: string;
  endLocal: string;
  requiredCount: number;
  notes?: string;
}) {
  const user = await requireRole("MANAGER", "ADMIN");
  await assertUnitForManager(user, input.unitId);
  const shift = await prisma.shift.findFirst({
    where: { id: input.shiftId, unitId: input.unitId, schedulePeriod: { status: "DRAFT" } },
    include: {
      schedulePeriod: { select: { id: true, startDate: true, endDate: true } },
      assignments: { where: { status: { not: "DROPPED" } }, select: { id: true } },
    },
  });
  if (!shift?.schedulePeriod) throw new Error("Only shifts in a draft schedule can be edited");
  const jobType = await prisma.jobType.findFirst({
    where: { id: input.jobTypeId, hospitalId: user.hospitalId },
    select: { id: true },
  });
  if (!jobType) throw new Error("Select a valid job type");
  const requiredCount = Number(input.requiredCount);
  if (!Number.isInteger(requiredCount) || requiredCount < 1 || requiredCount > 100) {
    throw new Error("Required staff must be between 1 and 100");
  }
  if (requiredCount < shift.assignments.length) {
    throw new Error("Required staff cannot be lower than the number already assigned");
  }
  const startTime = localDateTimeToUtc(input.startLocal, user.hospital.timeZone);
  const endTime = localDateTimeToUtc(input.endLocal, user.hospital.timeZone);
  if (endTime <= startTime) throw new Error("Shift end must be after its start");
  if (endTime.getTime() - startTime.getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("A shift cannot exceed 24 hours");
  }
  if (startTime < shift.schedulePeriod.startDate || endTime > shift.schedulePeriod.endDate) {
    throw new Error("Shift times must fall within its schedule period");
  }
  const changesEligibility =
    shift.jobTypeId !== jobType.id ||
    shift.startTime.getTime() !== startTime.getTime() ||
    shift.endTime.getTime() !== endTime.getTime();
  if (shift.assignments.length > 0 && changesEligibility) {
    throw new Error("Time or job type cannot change after workers are assigned");
  }
  const notes = input.notes?.trim().slice(0, 500) || null;
  await prisma.$transaction(async (tx) => {
    await tx.shift.update({
      where: { id: shift.id },
      data: { jobTypeId: jobType.id, startTime, endTime, requiredCount, notes },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "SHIFT_UPDATED",
        resourceType: "Shift",
        resourceId: shift.id,
        metadata: { unitId: input.unitId, startTime: startTime.toISOString(), endTime: endTime.toISOString(), jobTypeId: jobType.id, requiredCount },
      },
      tx
    );
  });
}

export async function deleteDraftShift(shiftId: string, unitId: string) {
  const user = await requireRole("MANAGER", "ADMIN");
  await assertUnitForManager(user, unitId);
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, unitId, schedulePeriod: { status: "DRAFT" } },
    select: { id: true, assignments: { where: { status: { not: "DROPPED" } }, select: { id: true } } },
  });
  if (!shift) throw new Error("Only shifts in a draft schedule can be deleted");
  if (shift.assignments.length > 0) throw new Error("A shift with assigned workers cannot be deleted");
  await prisma.$transaction(async (tx) => {
    await recordAuditEvent({ hospitalId: user.hospitalId, actorId: user.id, action: "SHIFT_DELETED", resourceType: "Shift", resourceId: shift.id, metadata: { unitId } }, tx);
    await tx.shift.delete({ where: { id: shift.id } });
  });
}

export async function publishSchedulePeriod(schedulePeriodId: string) {
  const user = await requireRole("MANAGER", "ADMIN");

  const period = await prisma.schedulePeriod.findUnique({ where: { id: schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");

  await assertUnitForManager(user, period.unitId);

  const notificationIds = await withSchedulingTransaction(async (tx) => {
    const current = await tx.schedulePeriod.findUnique({
      where: { id: schedulePeriodId },
      include: {
        unit: { select: { name: true } },
        shifts: {
          select: {
            id: true,
            assignments: {
              where: { status: { not: "DROPPED" } },
              select: { userId: true, status: true },
            },
          },
        },
      },
    });
    if (!current || current.unitId !== period.unitId) throw new Error("Schedule period not found");
    if (current.status === "PUBLISHED") throw new Error("This schedule is already published");
    if (current.requestsOpen) throw new Error("Close the worker request window before publishing");
    if (current.shifts.length === 0) throw new Error("Add at least one shift before publishing");
    const pending = current.shifts.some((shift) =>
      shift.assignments.some((assignment) => assignment.status === "SELF_SCHEDULED")
    );
    if (pending) throw new Error("Review all pending shift pickups before publishing");
    for (const shift of current.shifts) {
      for (const assignment of shift.assignments) {
        await checkAssignmentSafety(tx, { userId: assignment.userId, shiftId: shift.id });
      }
    }

    await tx.schedulePeriod.update({
      where: { id: schedulePeriodId },
      data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: user.id },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "SCHEDULE_PUBLISHED",
        resourceType: "SchedulePeriod",
        resourceId: schedulePeriodId,
        metadata: { unitId: period.unitId },
      },
      tx
    );
    const recipientIds = [
      ...new Set(current.shifts.flatMap((shift) => shift.assignments.map(({ userId }) => userId))),
    ];
    const title = `${current.unit.name} schedule published`;
    const body = `${current.startDate.toLocaleDateString()} – ${current.endDate.toLocaleDateString()}. Review My Schedule for details.`;
    const notifications = await Promise.all(
      recipientIds.map((userId) =>
        tx.notification.create({
          data: {
            userId,
            type: "SCHEDULE_PUBLISHED",
            title,
            body,
            payload: { schedulePeriodId: current.id, unitId: current.unitId },
          },
        })
      )
    );
    return notifications.map(({ id }) => id);
  });
  await Promise.all(notificationIds.map(deliverPushNotification));
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
  if (unitIds) {
    await Promise.all(unitIds.map((unitId) => assertUnitForManager(manager, unitId)));
  }

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
  if (unitIds) {
    await Promise.all(unitIds.map((unitId) => assertUnitForManager(manager, unitId)));
  }

  return prisma.timeOffRequest.findMany({
    where: { user: { accountType: "WORKER", unitMemberships: { some: { unitId: { in: scoped } } } } },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          badgeNumber: true,
          // Scoped to the units in view so a worker who also belongs to a
          // unit outside the manager's scope doesn't leak that unit's name.
          unitMemberships: {
            where: { unitId: { in: scoped } },
            select: { unit: { select: { name: true } } },
          },
        },
      },
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
    include: {
      user: { select: { id: true, hospitalId: true, unitMemberships: { select: { unitId: true } } } },
    },
  });
  if (!request) throw new Error("Time off request not found");
  if (request.user.hospitalId !== manager.hospitalId) throw new Error("Time off request not found");
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

    await recordAuditEvent(
      {
        hospitalId: manager.hospitalId,
        actorId: manager.id,
        action: "TIME_OFF_REVIEWED",
        resourceType: "TimeOffRequest",
        resourceId: requestId,
        metadata: { decision, requesterId: request.userId },
      },
      tx
    );
  });
}

/** Toggle whether a schedule period is open for workers to submit their
 * requested days — independent of the DRAFT/PUBLISHED status, which governs
 * the actual built shift schedule, not the request-taking phase. */
export async function setScheduleRequestWindow(schedulePeriodId: string, open: boolean) {
  const user = await requireRole("MANAGER", "ADMIN");

  const period = await prisma.schedulePeriod.findUnique({ where: { id: schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");

  await assertUnitForManager(user, period.unitId);

  await prisma.$transaction(async (tx) => {
    await tx.schedulePeriod.update({
      where: { id: schedulePeriodId },
      data: { requestsOpen: open },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: open ? "SCHEDULE_REQUESTS_OPENED" : "SCHEDULE_REQUESTS_CLOSED",
        resourceType: "SchedulePeriod",
        resourceId: schedulePeriodId,
        metadata: { unitId: period.unitId },
      },
      tx
    );
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
  await assertUnitForManager(user, unitId);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error("Enter a valid start date.");
  const start = localDateTimeToUtc(`${startDate}T00:00`, user.hospital.timeZone);
  const endDate = addDaysToLocalDate(startDate, 42);
  const end = localDateTimeToUtc(`${endDate}T00:00`, user.hospital.timeZone);

  const existing = await prisma.schedulePeriod.findUnique({
    where: { unitId_startDate_endDate: { unitId, startDate: start, endDate: end } },
  });
  if (existing) {
    throw new Error("A schedule period for that exact 6-week span already exists.");
  }

  return prisma.$transaction(async (tx) => {
    const period = await tx.schedulePeriod.create({
      data: { unitId, startDate: start, endDate: end, status: "DRAFT", requestsOpen: true },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "SCHEDULE_REQUEST_WINDOW_CREATED",
        resourceType: "SchedulePeriod",
        resourceId: period.id,
        metadata: { unitId, startDate: start.toISOString(), endDate: end.toISOString() },
      },
      tx
    );
    return period;
  });
}

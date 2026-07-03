import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, scopedUnitIds, type CurrentUser } from "@/lib/dal";

/** A worker only ever sees their own assignments/credentials — enforced by
 * always filtering on the verified session's userId, never a client-supplied id. */
export async function getMySchedule() {
  const user = await getCurrentUser();
  return getScheduleForUser(user.id);
}

/** Split out from getMySchedule() so API routes (mobile) can supply an
 * already-resolved userId from getApiUser() instead of the redirect-on-miss
 * getCurrentUser(), which doesn't make sense for a JSON API response. */
export async function getScheduleForUser(userId: string) {
  return prisma.scheduleAssignment.findMany({
    where: { userId, status: { not: "DROPPED" } },
    include: {
      shift: {
        include: {
          unit: true,
          jobType: true,
          // Status drives calendar-sync eligibility — spec says workers sync
          // once a schedule is "fully published", not while still draft.
          schedulePeriod: { select: { status: true } },
        },
      },
    },
    orderBy: { shift: { startTime: "asc" } },
  });
}

/** Upcoming shifts in the worker's unit(s) they haven't already signed up for.
 * Priority-tier open/close windows aren't enforced yet (that policy is still
 * undefined — see README "Decisions needed"); every unit member currently
 * sees the same open-shift list regardless of tier. */
export async function getOpenShifts() {
  const user = await getCurrentUser();
  return getOpenShiftsForUser(user);
}

/** Core logic split from getOpenShifts() — takes a resolved user (web's
 * getCurrentUser() or mobile's getApiUser()) instead of fetching it itself. */
export async function getOpenShiftsForUser(user: CurrentUser) {
  const unitIds = scopedUnitIds(user) ?? [];
  if (unitIds.length === 0) return [];

  const shifts = await prisma.shift.findMany({
    where: { unitId: { in: unitIds }, startTime: { gte: new Date() } },
    include: {
      unit: { select: { name: true } },
      jobType: { select: { name: true } },
      assignments: {
        where: { status: { not: "DROPPED" } },
        select: { userId: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return shifts
    .filter((shift) => !shift.assignments.some((a) => a.userId === user.id))
    .map((shift) => ({
      ...shift,
      signedUpCount: shift.assignments.length,
    }));
}

export async function signUpForShift(shiftId: string) {
  const user = await getCurrentUser();
  return signUpForShiftAsUser(user, shiftId);
}

/** Core logic split from signUpForShift() — see getOpenShiftsForUser(). */
export async function signUpForShiftAsUser(user: CurrentUser, shiftId: string) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Shift not found");

  const unitIds = scopedUnitIds(user) ?? [];
  if (!unitIds.includes(shift.unitId)) {
    throw new Error("You aren't assigned to this unit");
  }

  await prisma.scheduleAssignment.upsert({
    where: { shiftId_userId: { shiftId, userId: user.id } },
    update: { status: "SELF_SCHEDULED" },
    create: { shiftId, userId: user.id, status: "SELF_SCHEDULED" },
  });
}

export async function dropShift(shiftId: string) {
  const user = await getCurrentUser();
  return dropShiftAsUser(user.id, shiftId);
}

/** Core logic split from dropShift() — see getOpenShiftsForUser(). */
export async function dropShiftAsUser(userId: string, shiftId: string) {
  const assignment = await prisma.scheduleAssignment.findUnique({
    where: { shiftId_userId: { shiftId, userId } },
  });
  if (!assignment || assignment.userId !== userId) {
    throw new Error("No signup found to cancel");
  }
  if (assignment.status !== "SELF_SCHEDULED") {
    throw new Error("Only self-scheduled signups can be cancelled here — ask your manager about assigned shifts");
  }

  await prisma.scheduleAssignment.update({
    where: { id: assignment.id },
    data: { status: "DROPPED" },
  });
}

export async function getMyCredentials() {
  const user = await getCurrentUser();
  return getCredentialsForUser(user.id);
}

/** See getScheduleForUser() — same split, for the mobile API route. */
export async function getCredentialsForUser(userId: string) {
  return prisma.credential.findMany({
    where: { userId },
    orderBy: { expirationDate: "asc" },
  });
}

export async function getMyTimeEntries() {
  const user = await getCurrentUser();

  return prisma.timeEntry.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });
}

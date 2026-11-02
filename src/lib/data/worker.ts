import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, scopedUnitIds, type CurrentUser } from "@/lib/dal";
import { CredentialType, TimeOffType } from "@/generated/prisma/enums";
import { deliverPushNotification } from "@/lib/push";
import {
  deleteCredentialObject,
  getCredentialObject,
  putCredentialObject,
  usesCredentialObjectStorage,
} from "@/lib/credential-storage";
import { recordAuditEvent } from "@/lib/audit";
import { checkAssignmentSafety, withSchedulingTransaction } from "@/lib/schedule-assignment";
import { CREDENTIAL_TYPE_LABELS } from "@/lib/credential-types";
import {
  durationHours,
  intervalsOverlap,
  scheduledHoursInWindow,
  workWeek,
} from "@/lib/scheduling-rules";

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
 * getCurrentUser() or mobile's getApiUser()) instead of fetching it itself.
 * Managers/admins are salaried, not hourly — they don't pick up shifts, so
 * this returns nothing for them rather than exposing a list they can't act on. */
export async function getOpenShiftsForUser(user: CurrentUser) {
  if (user.accountType !== "WORKER") return [];

  const unitIds = scopedUnitIds(user) ?? [];
  if (unitIds.length === 0) return [];

  const shifts = await prisma.shift.findMany({
    where: {
      unitId: { in: unitIds },
      jobTypeId: user.jobType?.id ?? "__no_matching_job_type__",
      startTime: { gte: new Date() },
    },
    include: {
      unit: { select: { name: true } },
      jobType: { select: { name: true, requiredCredentialTypes: true } },
      assignments: {
        where: { status: { not: "DROPPED" } },
        select: { userId: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  if (shifts.length === 0) return [];
  const windows = shifts.map(({ startTime }) =>
    workWeek(startTime, user.hospital.timeZone, user.hospital.weekStartsOn)
  );
  const rangeStart = new Date(Math.min(...windows.map(({ start }) => start.getTime())));
  const rangeEnd = new Date(Math.max(...windows.map(({ end }) => end.getTime())));
  const [existingAssignments, credentials] = await Promise.all([
    prisma.scheduleAssignment.findMany({
      where: {
        userId: user.id,
        status: { not: "DROPPED" },
        shift: { startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
      },
      select: { shift: { select: { startTime: true, endTime: true } } },
    }),
    prisma.credential.findMany({
      where: { userId: user.id },
      select: { type: true, expirationDate: true },
    }),
  ]);

  return shifts
    .filter(
      (shift) =>
        !shift.assignments.some((a) => a.userId === user.id) &&
        shift.assignments.length < shift.requiredCount
    )
    .map((shift) => {
      const week = workWeek(
        shift.startTime,
        user.hospital.timeZone,
        user.hospital.weekStartsOn
      );
      const hasConflict = existingAssignments.some(({ shift: assignedShift }) =>
        intervalsOverlap(shift, assignedShift)
      );
      const projectedHours =
        scheduledHoursInWindow(existingAssignments.map(({ shift: range }) => range), week) +
        durationHours(shift);
      const missingCredentialTypes = shift.jobType.requiredCredentialTypes.filter(
        (type) =>
          !credentials.some(
            (credential) =>
              credential.type === type && credential.expirationDate >= shift.endTime
          )
      );
      return {
        ...shift,
        signedUpCount: shift.assignments.length,
        projectedHours,
        workloadWarning: projectedHours > user.hospital.weeklyHoursWarning,
        workloadWarningThreshold: user.hospital.weeklyHoursWarning,
        hasConflict,
        missingCredentialTypes,
        missingCredentialLabels: missingCredentialTypes.map((type) => CREDENTIAL_TYPE_LABELS[type]),
        credentialEligible: missingCredentialTypes.length === 0,
      };
    });
}

export async function signUpForShift(shiftId: string) {
  const user = await getCurrentUser();
  return signUpForShiftAsUser(user, shiftId);
}

/** Core logic split from signUpForShift() — see getOpenShiftsForUser(). */
export async function signUpForShiftAsUser(user: CurrentUser, shiftId: string) {
  if (user.accountType !== "WORKER") {
    throw new Error("Only workers can pick up open shifts");
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Shift not found");

  const unitIds = scopedUnitIds(user) ?? [];
  if (!unitIds.includes(shift.unitId)) {
    throw new Error("You aren't assigned to this unit");
  }
  if (!user.jobType || user.jobType.id !== shift.jobTypeId) {
    throw new Error("This shift requires a different job qualification");
  }

  const title = `${user.firstName} ${user.lastName} wants to pick up a shift`;
  const notificationIds = await withSchedulingTransaction(async (tx) => {
    const safety = await checkAssignmentSafety(tx, { userId: user.id, shiftId });
    await tx.scheduleAssignment.upsert({
      where: { shiftId_userId: { shiftId, userId: user.id } },
      update: { status: "SELF_SCHEDULED" },
      create: { shiftId, userId: user.id, status: "SELF_SCHEDULED" },
    });

    const managers = await tx.user.findMany({
      where: { accountType: "MANAGER", isActive: true, unitMemberships: { some: { unitId: shift.unitId } } },
      select: { id: true },
    });
    const workload = safety.workloadWarning
      ? ` Projected scheduled workload is ${safety.projectedHours.toFixed(1)} hours this week.`
      : "";
    const body = `${shift.startTime.toLocaleString()} – ${shift.endTime.toLocaleTimeString()}.${workload} Review it in the schedule.`;
    const notifications = await Promise.all(
      managers.map(({ id: userId }) =>
        tx.notification.create({ data: { userId, type: "SHIFT_PICKUP_REQUESTED", title, body } })
      )
    );
    return notifications.map(({ id }) => id);
  });
  await Promise.all(notificationIds.map(deliverPushNotification));
}

export async function getMyCredentials() {
  const user = await getCurrentUser();
  return getCredentialsForUser(user.id);
}

/** See getScheduleForUser() — same split, for the mobile API route. */
export async function getCredentialsForUser(userId: string) {
  return prisma.credential.findMany({
    where: { userId },
    // The document bytes never belong in a list payload — fetch them one at a
    // time through getCredentialFileForUser() instead.
    omit: { fileData: true },
    orderBy: { expirationDate: "asc" },
  });
}

const CREDENTIAL_FILE_MAX_BYTES = 10 * 1024 * 1024;
const CREDENTIAL_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

type CredentialFileInput = { name: string; mimeType: string; data: Uint8Array<ArrayBuffer> };

function validateCredentialFile(file: CredentialFileInput) {
  if (!CREDENTIAL_FILE_MIME_TYPES.has(file.mimeType)) {
    throw new Error("Unsupported file type — upload a PDF or an image (JPEG, PNG, WebP, HEIC).");
  }
  if (file.data.byteLength === 0) {
    throw new Error("The uploaded file is empty.");
  }
  if (file.data.byteLength > CREDENTIAL_FILE_MAX_BYTES) {
    throw new Error("File is too large — the limit is 10 MB.");
  }
}

export type NewCredentialInput = {
  type: string;
  customName?: string | null;
  issuingBody?: string | null;
  credentialNumber?: string | null;
  expirationDate: string;
  file?: CredentialFileInput | null;
};

export async function addMyCredential(input: NewCredentialInput) {
  const user = await getCurrentUser();
  return addCredentialForUser(user.id, input);
}

export async function addCredentialForUser(userId: string, input: NewCredentialInput) {
  if (!Object.hasOwn(CredentialType, input.type)) {
    throw new Error("Pick a credential type from the list.");
  }
  const type = input.type as CredentialType;

  const customName = input.customName?.trim() || null;
  if (type === "OTHER" && !customName) {
    throw new Error("Name the certification when choosing Specialty certification / Other.");
  }

  // A bare YYYY-MM-DD (what <input type="date"> submits) parses as UTC
  // midnight, which displays as the previous day in US timezones. Anchor
  // date-only values to local midnight instead so the date shown matches the
  // date typed.
  const raw = input.expirationDate;
  const expirationDate = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);
  if (Number.isNaN(expirationDate.getTime())) {
    throw new Error("Enter a valid expiration date.");
  }

  if (input.file) validateCredentialFile(input.file);

  const credential = await prisma.credential.create({
    data: {
      userId,
      type,
      customName,
      issuingBody: input.issuingBody?.trim() || null,
      credentialNumber: input.credentialNumber?.trim() || null,
      expirationDate,
    },
    omit: { fileData: true },
  });
  if (input.file) {
    try {
      await saveCredentialFileForUser(userId, credential.id, input.file);
    } catch (error) {
      await prisma.credential.delete({ where: { id: credential.id } });
      throw error;
    }
  }
  return prisma.credential.findUniqueOrThrow({
    where: { id: credential.id },
    omit: { fileData: true },
  });
}

export async function uploadMyCredentialFile(
  credentialId: string,
  file: { name: string; mimeType: string; data: Uint8Array<ArrayBuffer> }
) {
  const user = await getCurrentUser();
  return saveCredentialFileForUser(user.id, credentialId, file);
}

export async function saveCredentialFileForUser(
  userId: string,
  credentialId: string,
  file: CredentialFileInput
) {
  validateCredentialFile(file);

  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
    select: { id: true, storageKey: true, user: { select: { hospitalId: true } } },
  });
  if (!credential) throw new Error("Credential not found");

  if (usesCredentialObjectStorage()) {
    const newKey = await putCredentialObject({
      hospitalId: credential.user.hospitalId,
      credentialId,
      mimeType: file.mimeType,
      data: file.data,
    });
    try {
      await prisma.$transaction(async (tx) => {
        await tx.credential.update({
          where: { id: credentialId },
          data: {
            fileName: file.name,
            fileMimeType: file.mimeType,
            fileData: null,
            storageProvider: "s3",
            storageKey: newKey,
            fileUploadedAt: new Date(),
          },
        });
        await recordAuditEvent(
          {
            hospitalId: credential.user.hospitalId,
            actorId: userId,
            action: "CREDENTIAL_DOCUMENT_UPLOADED",
            resourceType: "Credential",
            resourceId: credentialId,
            metadata: { storageProvider: "s3", mimeType: file.mimeType },
          },
          tx
        );
      });
    } catch (error) {
      await deleteCredentialObject(newKey).catch(() => undefined);
      throw error;
    }
    if (credential.storageKey) {
      await deleteCredentialObject(credential.storageKey).catch(() => undefined);
    }
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.credential.update({
      where: { id: credentialId },
      data: {
        fileName: file.name,
        fileMimeType: file.mimeType,
        fileData: file.data,
        storageProvider: null,
        storageKey: null,
        fileUploadedAt: new Date(),
      },
    });
    await recordAuditEvent(
      {
        hospitalId: credential.user.hospitalId,
        actorId: userId,
        action: "CREDENTIAL_DOCUMENT_UPLOADED",
        resourceType: "Credential",
        resourceId: credentialId,
        metadata: { storageProvider: "database", mimeType: file.mimeType },
      },
      tx
    );
  });
}

export async function getCredentialFileForUser(userId: string, credentialId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
    select: {
      fileName: true,
      fileMimeType: true,
      fileData: true,
      storageKey: true,
      user: { select: { hospitalId: true } },
    },
  });
  if (!credential?.fileMimeType) return null;
  const data = credential.storageKey
    ? await getCredentialObject(credential.storageKey, credential.user.hospitalId)
    : credential.fileData;
  if (!data) return null;
  return {
    fileName: credential.fileName ?? "credential",
    mimeType: credential.fileMimeType,
    data,
  };
}

/** Role-aware document access: the owner always; admins for any worker in
 * their hospital; managers for workers who share one of their units. */
export async function getCredentialFileForViewer(viewer: CurrentUser, credentialId: string) {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    select: {
      fileName: true,
      fileMimeType: true,
      fileData: true,
      storageKey: true,
      user: {
        select: { id: true, hospitalId: true, unitMemberships: { select: { unitId: true } } },
      },
    },
  });
  if (!credential?.fileMimeType) return null;

  const owner = credential.user;
  const isOwner = owner.id === viewer.id;
  const isAdmin = viewer.accountType === "ADMIN" && owner.hospitalId === viewer.hospitalId;
  const viewerUnits = scopedUnitIds(viewer);
  const isManagerOfWorker =
    viewer.accountType === "MANAGER" &&
    viewerUnits !== null &&
    owner.unitMemberships.some((m) => viewerUnits.includes(m.unitId));

  if (!isOwner && !isAdmin && !isManagerOfWorker) return null;

  const data = credential.storageKey
    ? await getCredentialObject(credential.storageKey, owner.hospitalId)
    : credential.fileData;
  if (!data) return null;

  return {
    fileName: credential.fileName ?? "credential",
    mimeType: credential.fileMimeType,
    data,
  };
}

export async function getMyTimeEntries() {
  const user = await getCurrentUser();

  return prisma.timeEntry.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });
}

/** Parses a bare YYYY-MM-DD (what <input type="date"> submits) as local
 * midnight rather than UTC midnight — see the same fix on Credential
 * expirationDate for why. Falls back to a plain Date parse for anything else
 * (e.g. an ISO timestamp from the mobile app). */
function parseDateOnly(raw: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
}

export type NewTimeOffRequestInput = {
  type: string;
  startDate: string;
  endDate: string;
  hours: number;
  reason?: string | null;
};

export async function requestMyTimeOff(input: NewTimeOffRequestInput) {
  const user = await getCurrentUser();
  return requestTimeOffForUser(user.id, input);
}

export async function requestTimeOffForUser(userId: string, input: NewTimeOffRequestInput) {
  if (!Object.hasOwn(TimeOffType, input.type)) {
    throw new Error("Pick a time off type from the list.");
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Enter valid start and end dates.");
  }
  if (endDate < startDate) {
    throw new Error("End date can't be before the start date.");
  }

  const hours = Number(input.hours);
  if (!Number.isInteger(hours) || hours <= 0 || hours > 999) {
    throw new Error("Pick how many hours you're requesting.");
  }

  const reason = input.reason?.trim() || null;
  if (input.type === "OTHER" && !reason) {
    throw new Error("Add a comment describing the reason when choosing Other.");
  }

  return prisma.timeOffRequest.create({
    data: {
      userId,
      type: input.type as TimeOffType,
      startDate,
      endDate,
      hours,
      reason,
    },
  });
}

export async function getMyTimeOffRequests() {
  const user = await getCurrentUser();
  return getTimeOffRequestsForUser(user.id);
}

export async function getTimeOffRequestsForUser(userId: string) {
  return prisma.timeOffRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
  });
}

/** Only the requester can withdraw, and only before a manager has decided —
 * once approved it's affected other people's shift coverage, so it needs a
 * manager to undo it, not a self-service action. */
export async function withdrawMyTimeOffRequest(requestId: string) {
  const user = await getCurrentUser();
  return withdrawTimeOffRequestForUser(user.id, requestId);
}

export async function withdrawTimeOffRequestForUser(userId: string, requestId: string) {
  const result = await prisma.timeOffRequest.deleteMany({
    where: { id: requestId, userId, status: "PENDING" },
  });
  if (result.count === 0) {
    throw new Error("Request not found or already reviewed");
  }
}

/** Released (requestsOpen) periods for the worker's unit(s), each with the
 * worker's own submission attached (or null) so the UI can prefill an
 * edit instead of always starting blank. */
export async function getOpenScheduleRequestWindows() {
  const user = await getCurrentUser();
  return getOpenScheduleRequestWindowsForUser(user);
}

export async function getOpenScheduleRequestWindowsForUser(user: CurrentUser) {
  const unitIds = scopedUnitIds(user) ?? [];
  if (unitIds.length === 0) return [];

  const periods = await prisma.schedulePeriod.findMany({
    where: { unitId: { in: unitIds }, requestsOpen: true },
    include: {
      unit: { select: { name: true } },
      scheduleRequests: { where: { userId: user.id } },
    },
    orderBy: { startDate: "asc" },
  });

  return periods.map((period) => ({
    ...period,
    myRequest: period.scheduleRequests[0] ?? null,
  }));
}

export type SubmitScheduleRequestInput = {
  schedulePeriodId: string;
  requestedDates: string[];
  note?: string | null;
};

export async function submitMyScheduleRequest(input: SubmitScheduleRequestInput) {
  const user = await getCurrentUser();
  return submitScheduleRequestForUser(user.id, input);
}

export async function submitScheduleRequestForUser(userId: string, input: SubmitScheduleRequestInput) {
  const period = await prisma.schedulePeriod.findUnique({ where: { id: input.schedulePeriodId } });
  if (!period) throw new Error("Schedule period not found");
  if (!period.requestsOpen) throw new Error("This period isn't open for requests right now.");

  const dates = input.requestedDates.map((raw) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${raw}`);
    return date;
  });

  return prisma.scheduleRequest.upsert({
    where: { schedulePeriodId_userId: { schedulePeriodId: input.schedulePeriodId, userId } },
    update: { requestedDates: dates, note: input.note?.trim() || null },
    create: {
      schedulePeriodId: input.schedulePeriodId,
      userId,
      requestedDates: dates,
      note: input.note?.trim() || null,
    },
  });
}

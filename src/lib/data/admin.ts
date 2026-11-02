import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { recordAuditEvent } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { loginAttemptKeyHash } from "@/lib/auth";
import { CREDENTIAL_TYPE_OPTIONS } from "@/lib/credential-types";
import type { CredentialType } from "@/generated/prisma/client";
import { UnitType } from "@/generated/prisma/client";
import {
  CreateHospitalUserSchema,
  StrongPasswordSchema,
  UpdateHospitalUserAccessSchema,
} from "@/lib/validation/password";
import { parseCallInResolution } from "@/lib/validation/call-in";

/** Org-wide overview. Admin only — sees every unit and job type in the hospital. */
export async function getOrgOverview() {
  const user = await requireRole("ADMIN");

  const [hospital, units, openCallIns] = await Promise.all([
    prisma.hospital.findUniqueOrThrow({ where: { id: user.hospitalId } }),
    prisma.unit.findMany({
      where: { hospitalId: user.hospitalId },
      include: {
        _count: { select: { memberships: true } },
        memberships: {
          where: { user: { accountType: "MANAGER" } },
          select: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.callIn.findMany({
      where: { status: "OPEN", shift: { unit: { hospitalId: user.hospitalId } } },
      include: {
        shift: { select: { startTime: true, endTime: true, unit: { select: { name: true } } } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { calledInAt: "desc" },
    }),
  ]);

  return { hospital, units, openCallIns };
}

export async function resolveHospitalCallIn(
  callInId: string,
  input: { status: unknown; notes: unknown }
) {
  const admin = await requireRole("ADMIN");
  const resolution = parseCallInResolution(input);
  const callIn = await prisma.callIn.findFirst({
    where: { id: callInId, status: "OPEN", shift: { unit: { hospitalId: admin.hospitalId } } },
    select: { id: true, status: true },
  });
  if (!callIn) throw new Error("Open call-in not found");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.callIn.updateMany({
      where: { id: callIn.id, status: "OPEN" },
      data: {
        status: resolution.status,
        notes: resolution.notes,
        handledById: admin.id,
        handledAt: new Date(),
      },
    });
    if (updated.count !== 1) throw new Error("Call-in was already handled");
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "CALL_IN_RESOLVED",
        resourceType: "CallIn",
        resourceId: callIn.id,
        metadata: { previousStatus: callIn.status, currentStatus: resolution.status },
      },
      tx
    );
  });
}

export async function getPushDeliveryOverview() {
  const user = await requireRole("ADMIN");
  const hospitalFilter = { user: { hospitalId: user.hospitalId } };
  const [groups, recentFailures] = await Promise.all([
    prisma.notification.groupBy({
      by: ["pushStatus"],
      where: hospitalFilter,
      _count: { _all: true },
    }),
    prisma.notification.findMany({
      where: { ...hospitalFilter, pushStatus: "FAILED" },
      select: {
        id: true,
        title: true,
        pushAttempts: true,
        pushNextAttemptAt: true,
        pushLastError: true,
        user: { select: { firstName: true, lastName: true, badgeNumber: true } },
      },
      orderBy: { pushNextAttemptAt: "desc" },
      take: 50,
    }),
  ]);
  const counts = Object.fromEntries(groups.map((group) => [group.pushStatus, group._count._all]));
  return { counts, recentFailures };
}

export async function getJobTypes() {
  const admin = await requireRole("ADMIN");
  return prisma.jobType.findMany({ where: { hospitalId: admin.hospitalId }, orderBy: { name: "asc" } });
}

export async function updateJobTypeCredentialRequirements(
  jobTypeId: string,
  requiredCredentialTypes: unknown[]
) {
  const admin = await requireRole("ADMIN");
  const allowed = new Set(CREDENTIAL_TYPE_OPTIONS.map(([type]) => type));
  const requirements = [
    ...new Set(
      requiredCredentialTypes.filter(
        (value): value is CredentialType => typeof value === "string" && allowed.has(value as CredentialType)
      )
    ),
  ];
  if (requirements.length !== requiredCredentialTypes.length) {
    throw new Error("One or more credential requirements are invalid");
  }
  const jobType = await prisma.jobType.findFirst({
    where: { id: jobTypeId, hospitalId: admin.hospitalId },
    select: { id: true, requiredCredentialTypes: true },
  });
  if (!jobType) throw new Error("Job type not found");

  await prisma.$transaction(async (tx) => {
    await tx.jobType.update({
      where: { id: jobType.id },
      data: { requiredCredentialTypes: requirements },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "JOB_TYPE_CREDENTIAL_REQUIREMENTS_UPDATED",
        resourceType: "JobType",
        resourceId: jobType.id,
        metadata: { previous: jobType.requiredCredentialTypes, current: requirements },
      },
      tx
    );
  });
}

export async function createHospitalJobType(input: { name: unknown; category: unknown }) {
  const admin = await requireRole("ADMIN");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!name || name.length > 80) throw new Error("Job type name is required and must be 80 characters or fewer");
  if (category.length > 80) throw new Error("Category must be 80 characters or fewer");
  try {
    return await prisma.$transaction(async (tx) => {
      const jobType = await tx.jobType.create({
        data: { hospitalId: admin.hospitalId, name, category: category || null },
      });
      await recordAuditEvent(
        {
          hospitalId: admin.hospitalId,
          actorId: admin.id,
          action: "JOB_TYPE_CREATED",
          resourceType: "JobType",
          resourceId: jobType.id,
          metadata: { name, category: category || null },
        },
        tx
      );
      return jobType.id;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("A job type with that name already exists for this hospital");
    }
    throw error;
  }
}

export async function getHospitalUnitSettings() {
  const admin = await requireRole("ADMIN");
  return prisma.unit.findMany({
    where: { hospitalId: admin.hospitalId },
    select: { id: true, name: true, type: true, _count: { select: { memberships: true, shifts: true } } },
    orderBy: { name: "asc" },
  });
}

function parseUnitInput(input: { name: unknown; type: unknown }) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const type = typeof input.type === "string" ? input.type : "";
  if (!name || name.length > 100) throw new Error("Unit name is required and must be 100 characters or fewer");
  if (!Object.values(UnitType).includes(type as UnitType)) throw new Error("Select a valid unit type");
  return { name, type: type as UnitType };
}

export async function createHospitalUnit(input: { name: unknown; type: unknown }) {
  const admin = await requireRole("ADMIN");
  const data = parseUnitInput(input);
  try {
    return await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({ data: { ...data, hospitalId: admin.hospitalId } });
      await recordAuditEvent(
        { hospitalId: admin.hospitalId, actorId: admin.id, action: "UNIT_CREATED", resourceType: "Unit", resourceId: unit.id, metadata: data },
        tx
      );
      return unit.id;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("A unit with that name already exists for this hospital");
    }
    throw error;
  }
}

export async function updateHospitalUnit(unitId: string, input: { name: unknown; type: unknown }) {
  const admin = await requireRole("ADMIN");
  const data = parseUnitInput(input);
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, hospitalId: admin.hospitalId },
    select: { id: true, name: true, type: true },
  });
  if (!unit) throw new Error("Unit not found");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.unit.update({ where: { id: unit.id }, data });
      await recordAuditEvent(
        {
          hospitalId: admin.hospitalId,
          actorId: admin.id,
          action: "UNIT_UPDATED",
          resourceType: "Unit",
          resourceId: unit.id,
          metadata: { previous: { name: unit.name, type: unit.type }, current: data },
        },
        tx
      );
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("A unit with that name already exists for this hospital");
    }
    throw error;
  }
}

export async function updateHospitalSchedulingPolicy(input: {
  timeZone: unknown;
  weekStartsOn: unknown;
  weeklyHoursWarning: unknown;
}) {
  const admin = await requireRole("ADMIN");
  const timeZone = typeof input.timeZone === "string" ? input.timeZone.trim() : "";
  const weekStartsOn = Number(input.weekStartsOn);
  const weeklyHoursWarning = Number(input.weeklyHoursWarning);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error("Enter a valid IANA time zone, such as America/Los_Angeles");
  }
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error("Select a valid week start day");
  }
  if (!Number.isFinite(weeklyHoursWarning) || weeklyHoursWarning <= 0 || weeklyHoursWarning > 168) {
    throw new Error("Weekly warning hours must be between 1 and 168");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.hospital.findUniqueOrThrow({ where: { id: admin.hospitalId } });
    await tx.hospital.update({
      where: { id: admin.hospitalId },
      data: { timeZone, weekStartsOn, weeklyHoursWarning },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "HOSPITAL_SCHEDULING_POLICY_UPDATED",
        resourceType: "Hospital",
        resourceId: admin.hospitalId,
        metadata: {
          previous: {
            timeZone: previous.timeZone,
            weekStartsOn: previous.weekStartsOn,
            weeklyHoursWarning: previous.weeklyHoursWarning,
          },
          current: { timeZone, weekStartsOn, weeklyHoursWarning },
        },
      },
      tx
    );
  });
}

/** Hospital-wide compiled credential list, soonest expiration first. Same
 * shape as the manager's unit view but across every unit, with unit names so
 * the admin can tell where each worker belongs. */
export async function getHospitalCredentials() {
  const user = await requireRole("ADMIN");

  const [credentials, workersWithoutCredentials] = await Promise.all([
    prisma.credential.findMany({
      where: { user: { accountType: "WORKER", hospitalId: user.hospitalId } },
      omit: { fileData: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            unitMemberships: { select: { unit: { select: { name: true } } } },
          },
        },
      },
      orderBy: { expirationDate: "asc" },
    }),
    prisma.user.findMany({
      where: {
        accountType: "WORKER",
        hospitalId: user.hospitalId,
        credentials: { none: {} },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        badgeNumber: true,
        unitMemberships: { select: { unit: { select: { name: true } } } },
      },
      orderBy: { lastName: "asc" },
    }),
  ]);

  return { credentials, workersWithoutCredentials };
}

export async function revokeAllSessionsForUser(userId: string) {
  const admin = await requireRole("ADMIN");
  const target = await prisma.user.findFirst({
    where: { id: userId, hospitalId: admin.hospitalId },
    select: { id: true },
  });
  if (!target) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "USER_SESSIONS_REVOKED",
        resourceType: "User",
        resourceId: target.id,
      },
      tx
    );
  });
}

export async function getHospitalAuditLogs(options: { cursor?: string; limit?: number } = {}) {
  const admin = await requireRole("ADMIN");
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const logs = await prisma.auditLog.findMany({
    where: { hospitalId: admin.hospitalId },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });
  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getHospitalAuditExport() {
  const admin = await requireRole("ADMIN");
  const logs = await prisma.auditLog.findMany({
    where: { hospitalId: admin.hospitalId },
    include: {
      actor: { select: { firstName: true, lastName: true, badgeNumber: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    // Protect the application from unbounded exports. Larger historical
    // exports belong in a background-job/reporting pipeline.
    take: 10_000,
  });
  await recordAuditEvent({
    hospitalId: admin.hospitalId,
    actorId: admin.id,
    action: "AUDIT_LOG_EXPORTED",
    resourceType: "AuditLog",
    metadata: { format: "csv", recordCount: logs.length },
  });
  return logs;
}

export async function getHospitalUsers() {
  const admin = await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    where: { hospitalId: admin.hospitalId },
    select: {
      id: true,
      badgeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      title: true,
      accountType: true,
      jobTypeId: true,
      jobType: { select: { name: true } },
      isActive: true,
      updatedAt: true,
      hospital: { select: { code: true } },
      unitMemberships: { select: { unit: { select: { id: true, name: true } } } },
    },
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  const hashes = users.map((user) => loginAttemptKeyHash(user.hospital.code, user.badgeNumber));
  const throttles = await prisma.loginThrottle.findMany({
    where: { keyHash: { in: hashes }, lockedUntil: { gt: new Date() } },
    select: { keyHash: true, lockedUntil: true },
  });
  const locks = new Map(throttles.map((item) => [item.keyHash, item.lockedUntil]));
  return users.map(({ hospital, ...user }) => ({
    ...user,
    loginLockedUntil: locks.get(loginAttemptKeyHash(hospital.code, user.badgeNumber)) ?? null,
  }));
}

export async function getUserProvisioningOptions() {
  const admin = await requireRole("ADMIN");
  const [units, jobTypes] = await Promise.all([
    prisma.unit.findMany({
      where: { hospitalId: admin.hospitalId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.jobType.findMany({
      where: { hospitalId: admin.hospitalId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { units, jobTypes };
}

export async function createHospitalUser(input: unknown) {
  const admin = await requireRole("ADMIN");
  const parsed = CreateHospitalUserSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid user details");
  const data = parsed.data;
  const distinctUnitIds = [...new Set(data.unitIds)];
  const [validUnitCount, validJobType] = await Promise.all([
    prisma.unit.count({ where: { id: { in: distinctUnitIds }, hospitalId: admin.hospitalId } }),
    data.jobTypeId
      ? prisma.jobType.count({ where: { id: data.jobTypeId, hospitalId: admin.hospitalId } })
      : Promise.resolve(1),
  ]);
  if (validUnitCount !== distinctUnitIds.length) throw new Error("One or more units are invalid");
  if (!validJobType) throw new Error("Job type is invalid");

  const passwordHash = await hashPassword(data.temporaryPassword);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          hospitalId: admin.hospitalId,
          accountType: data.accountType,
          badgeNumber: data.badgeNumber,
          passwordHash,
          mustChangePassword: true,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email?.toLowerCase() ?? null,
          jobTypeId: data.jobTypeId,
          unitMemberships: {
            create: distinctUnitIds.map((unitId, index) => ({ unitId, isPrimary: index === 0 })),
          },
        },
      });
      await recordAuditEvent(
        {
          hospitalId: admin.hospitalId,
          actorId: admin.id,
          action: "USER_CREATED",
          resourceType: "User",
          resourceId: user.id,
          metadata: { accountType: data.accountType, jobTypeId: data.jobTypeId, unitIds: distinctUnitIds },
        },
        tx
      );
      return user.id;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("That badge number or email is already in use");
    }
    throw error;
  }
}

export async function resetHospitalUserPassword(userId: string, temporaryPassword: unknown) {
  const admin = await requireRole("ADMIN");
  if (userId === admin.id) throw new Error("Use your account settings to change your own password");
  const parsed = StrongPasswordSchema.safeParse(temporaryPassword);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid temporary password");
  const target = await prisma.user.findFirst({
    where: { id: userId, hospitalId: admin.hospitalId },
    select: { id: true, isActive: true, badgeNumber: true, hospital: { select: { code: true } } },
  });
  if (!target) throw new Error("User not found");
  if (!target.isActive) throw new Error("Reactivate this account before resetting its password");

  const passwordHash = await hashPassword(parsed.data);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
        expoPushToken: null,
      },
    });
    await tx.loginThrottle.deleteMany({
      where: { keyHash: loginAttemptKeyHash(target.hospital.code, target.badgeNumber) },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "USER_PASSWORD_RESET",
        resourceType: "User",
        resourceId: target.id,
      },
      tx
    );
  });
}

export async function unlockHospitalUserLogin(userId: string) {
  const admin = await requireRole("ADMIN");
  const target = await prisma.user.findFirst({
    where: { id: userId, hospitalId: admin.hospitalId },
    select: { id: true, badgeNumber: true, hospital: { select: { code: true } } },
  });
  if (!target) throw new Error("User not found");
  await prisma.$transaction(async (tx) => {
    await tx.loginThrottle.deleteMany({
      where: { keyHash: loginAttemptKeyHash(target.hospital.code, target.badgeNumber) },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "USER_LOGIN_UNLOCKED",
        resourceType: "User",
        resourceId: target.id,
      },
      tx
    );
  });
}

export async function updateHospitalUserAccess(userId: string, input: unknown) {
  const admin = await requireRole("ADMIN");
  if (userId === admin.id) throw new Error("You cannot change your own role or unit access");
  const parsed = UpdateHospitalUserAccessSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid access settings");
  const distinctUnitIds = [...new Set(parsed.data.unitIds)];
  const [target, validUnitCount, validJobType] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, hospitalId: admin.hospitalId },
      select: { id: true, accountType: true },
    }),
    prisma.unit.count({ where: { id: { in: distinctUnitIds }, hospitalId: admin.hospitalId } }),
    parsed.data.jobTypeId
      ? prisma.jobType.count({ where: { id: parsed.data.jobTypeId, hospitalId: admin.hospitalId } })
      : Promise.resolve(1),
  ]);
  if (!target || target.accountType === "ADMIN") throw new Error("Staff account not found");
  if (validUnitCount !== distinctUnitIds.length) throw new Error("One or more units are invalid");
  if (!validJobType) throw new Error("Job type is invalid");

  await prisma.$transaction(async (tx) => {
    await tx.unitMembership.deleteMany({ where: { userId: target.id } });
    await tx.user.update({
      where: { id: target.id },
      data: {
        accountType: parsed.data.accountType,
        jobTypeId: parsed.data.jobTypeId,
        sessionVersion: { increment: 1 },
        unitMemberships: {
          create: distinctUnitIds.map((unitId, index) => ({ unitId, isPrimary: index === 0 })),
        },
      },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: "USER_ACCESS_UPDATED",
        resourceType: "User",
        resourceId: target.id,
        metadata: { previousAccountType: target.accountType, accountType: parsed.data.accountType, jobTypeId: parsed.data.jobTypeId, unitIds: distinctUnitIds },
      },
      tx
    );
  });
}

export async function setUserActiveState(userId: string, isActive: boolean) {
  const admin = await requireRole("ADMIN");
  if (admin.id === userId && !isActive) {
    throw new Error("You cannot deactivate your own account");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, hospitalId: admin.hospitalId },
    select: { id: true, isActive: true },
  });
  if (!target) throw new Error("User not found");
  if (target.isActive === isActive) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        isActive,
        // Deactivation invalidates every existing token immediately. A
        // reactivated user must authenticate again with the new version.
        ...(!isActive ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    await recordAuditEvent(
      {
        hospitalId: admin.hospitalId,
        actorId: admin.id,
        action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
        resourceType: "User",
        resourceId: target.id,
      },
      tx
    );
  });
}

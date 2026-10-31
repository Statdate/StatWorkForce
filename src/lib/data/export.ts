import "server-only";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";

const MAX_EXPORT_RECORDS = 100_000;

export class DataExportTooLargeError extends Error {
  constructor(public readonly recordCount: number) {
    super(`Hospital export contains ${recordCount} records; use the managed offline export process.`);
    this.name = "DataExportTooLargeError";
  }
}

export async function getHospitalDataExport(admin: {
  id: string;
  hospitalId: string;
  accountType: string;
}) {
  if (admin.accountType !== "ADMIN") throw new Error("Administrator access required");
  const hospitalId = admin.hospitalId;
  const unitScope = { unit: { hospitalId } };
  const userScope = { user: { hospitalId } };
  const shiftScope = { shift: { unit: { hospitalId } } };

  const counts = await Promise.all([
    prisma.unit.count({ where: { hospitalId } }),
    prisma.jobType.count({ where: { hospitalId } }),
    prisma.user.count({ where: { hospitalId } }),
    prisma.unitMembership.count({ where: userScope }),
    prisma.superuserAssignment.count({ where: userScope }),
    prisma.priorityGroup.count({ where: unitScope }),
    prisma.schedulePeriod.count({ where: unitScope }),
    prisma.scheduleRequest.count({ where: { schedulePeriod: unitScope } }),
    prisma.shift.count({ where: { unit: { hospitalId } } }),
    prisma.scheduleAssignment.count({ where: shiftScope }),
    prisma.timeOffRequest.count({ where: userScope }),
    prisma.timeEntry.count({ where: userScope }),
    prisma.credential.count({ where: userScope }),
    prisma.message.count({ where: { sender: { hospitalId }, recipient: { hospitalId } } }),
    prisma.notification.count({ where: userScope }),
    prisma.callIn.count({ where: shiftScope }),
    prisma.auditLog.count({ where: { hospitalId } }),
  ]);
  const recordCount = 1 + counts.reduce((total, count) => total + count, 0);
  if (recordCount > MAX_EXPORT_RECORDS) throw new DataExportTooLargeError(recordCount);

  const [
    hospital,
    units,
    jobTypes,
    users,
    unitMemberships,
    superuserAssignments,
    priorityGroups,
    schedulePeriods,
    scheduleRequests,
    shifts,
    scheduleAssignments,
    timeOffRequests,
    timeEntries,
    credentials,
    messages,
    notifications,
    callIns,
    auditLogs,
  ] = await Promise.all([
    prisma.hospital.findUniqueOrThrow({ where: { id: hospitalId } }),
    prisma.unit.findMany({ where: { hospitalId }, orderBy: { id: "asc" } }),
    prisma.jobType.findMany({ where: { hospitalId }, orderBy: { id: "asc" } }),
    prisma.user.findMany({
      where: { hospitalId },
      omit: { passwordHash: true, sessionVersion: true, expoPushToken: true },
      orderBy: { id: "asc" },
    }),
    prisma.unitMembership.findMany({ where: userScope, orderBy: { id: "asc" } }),
    prisma.superuserAssignment.findMany({ where: userScope, orderBy: { id: "asc" } }),
    prisma.priorityGroup.findMany({ where: unitScope, orderBy: { id: "asc" } }),
    prisma.schedulePeriod.findMany({ where: unitScope, orderBy: { id: "asc" } }),
    prisma.scheduleRequest.findMany({ where: { schedulePeriod: unitScope }, orderBy: { id: "asc" } }),
    prisma.shift.findMany({ where: { unit: { hospitalId } }, orderBy: { id: "asc" } }),
    prisma.scheduleAssignment.findMany({ where: shiftScope, orderBy: { id: "asc" } }),
    prisma.timeOffRequest.findMany({ where: userScope, orderBy: { id: "asc" } }),
    prisma.timeEntry.findMany({ where: userScope, orderBy: { id: "asc" } }),
    prisma.credential.findMany({
      where: userScope,
      omit: { fileData: true, storageKey: true },
      orderBy: { id: "asc" },
    }),
    prisma.message.findMany({
      where: { sender: { hospitalId }, recipient: { hospitalId } },
      orderBy: { id: "asc" },
    }),
    prisma.notification.findMany({
      where: userScope,
      omit: { pushTicketId: true, pushLastError: true },
      orderBy: { id: "asc" },
    }),
    prisma.callIn.findMany({ where: shiftScope, orderBy: { id: "asc" } }),
    prisma.auditLog.findMany({ where: { hospitalId }, orderBy: { id: "asc" } }),
  ]);

  await recordAuditEvent({
    hospitalId,
    actorId: admin.id,
    action: "HOSPITAL_DATA_EXPORTED",
    resourceType: "Hospital",
    resourceId: hospitalId,
    metadata: { format: "json", recordCount, documentFilesIncluded: false },
  });

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    recordCount,
    exclusions: [
      "password hashes and session versions",
      "mobile push tokens and provider error details",
      "credential document bytes and storage object keys",
      "login throttle records not attributable to a hospital",
    ],
    data: {
      hospital,
      units,
      jobTypes,
      users,
      unitMemberships,
      superuserAssignments,
      priorityGroups,
      schedulePeriods,
      scheduleRequests,
      shifts,
      scheduleAssignments,
      timeOffRequests,
      timeEntries,
      credentials,
      messages,
      notifications,
      callIns,
      auditLogs,
    },
  };
}

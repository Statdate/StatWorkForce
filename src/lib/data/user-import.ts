import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { recordAuditEvent } from "@/lib/audit";
import { CreateHospitalUserSchema } from "@/lib/validation/password";
import { readUserImportCsv } from "@/lib/user-import";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 200;
const normalize = (value: string) => value.trim().toLocaleLowerCase();

export class UserImportValidationError extends Error {
  constructor(public readonly report: Awaited<ReturnType<typeof validateHospitalUserImport>>) {
    super("User import validation failed");
    this.name = "UserImportValidationError";
  }
}

export async function validateHospitalUserImport(admin: { hospitalId: string }, file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error("CSV must be 1 MiB or smaller");
  const inputRows = readUserImportCsv(await file.text());
  if (inputRows.length === 0) throw new Error("CSV has no user rows");
  if (inputRows.length > MAX_ROWS) throw new Error(`CSV may contain at most ${MAX_ROWS} users`);
  const [units, jobTypes, existingUsers] = await Promise.all([
    prisma.unit.findMany({ where: { hospitalId: admin.hospitalId }, select: { id: true, name: true } }),
    prisma.jobType.findMany({ where: { hospitalId: admin.hospitalId }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { hospitalId: admin.hospitalId }, select: { badgeNumber: true, email: true } }),
  ]);
  const unitMap = new Map(units.map((unit) => [normalize(unit.name), unit]));
  const jobMap = new Map(jobTypes.map((job) => [normalize(job.name), job]));
  const existingBadges = new Set(existingUsers.map((user) => normalize(user.badgeNumber)));
  const existingEmails = new Set(existingUsers.flatMap((user) => user.email ? [normalize(user.email)] : []));
  const seenBadges = new Set<string>();
  const seenEmails = new Set<string>();
  const errors: Array<{ rowNumber: number; messages: string[] }> = [];
  const validRows = [];
  for (const row of inputRows) {
    const messages: string[] = [];
    const resolvedUnits = row.units.map((name) => unitMap.get(normalize(name)));
    const job = row.jobType ? jobMap.get(normalize(row.jobType)) : undefined;
    const badgeKey = normalize(row.badgeNumber);
    const emailKey = normalize(row.email);
    if (row.extraColumns) messages.push("Unexpected extra column(s)");
    if (row.units.length === 0 || resolvedUnits.some((unit) => !unit)) messages.push("Every unit must match an existing hospital unit");
    if (row.accountType === "WORKER" && !job) messages.push("Worker job type must match an existing hospital job type");
    if (row.accountType === "MANAGER" && row.jobType && !job) messages.push("Manager job type must be blank or match an existing hospital job type");
    if (existingBadges.has(badgeKey) || seenBadges.has(badgeKey)) messages.push("Badge number is already in use or duplicated in this file");
    if (row.email && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) messages.push("Email is already in use or duplicated in this file");
    const shape = CreateHospitalUserSchema.safeParse({
      firstName: row.firstName, lastName: row.lastName, badgeNumber: row.badgeNumber,
      email: row.email, accountType: row.accountType, jobTypeId: job?.id ?? "",
      unitIds: resolvedUnits.flatMap((unit) => unit ? [unit.id] : []),
      temporaryPassword: "ImportValidation1!",
    });
    if (!shape.success) messages.push(shape.error.issues[0]?.message ?? "Invalid user details");
    if (messages.length || !shape.success) errors.push({ rowNumber: row.rowNumber, messages: [...new Set(messages)] });
    else validRows.push({
      firstName: shape.data.firstName,
      lastName: shape.data.lastName,
      badgeNumber: shape.data.badgeNumber,
      email: shape.data.email,
      accountType: shape.data.accountType,
      jobTypeId: shape.data.jobTypeId,
      unitIds: shape.data.unitIds,
      sourceRowNumber: row.rowNumber,
    });
    seenBadges.add(badgeKey);
    if (row.email) seenEmails.add(emailKey);
  }
  return { totalRows: inputRows.length, validCount: validRows.length, errorCount: errors.length, errors, validRows };
}

function temporaryPassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}

export async function importHospitalUsers(admin: { id: string; hospitalId: string }, file: File) {
  const report = await validateHospitalUserImport(admin, file);
  if (report.errorCount) throw new UserImportValidationError(report);
  const rows = await Promise.all(report.validRows.map(async (row) => {
    const password = temporaryPassword();
    return { row, password, passwordHash: await hashPassword(password) };
  }));
  const created = await prisma.$transaction(async (tx) => {
    const credentials = [];
    for (const item of rows) {
      const user = await tx.user.create({
        data: {
          hospitalId: admin.hospitalId, accountType: item.row.accountType,
          badgeNumber: item.row.badgeNumber, passwordHash: item.passwordHash,
          mustChangePassword: true, firstName: item.row.firstName, lastName: item.row.lastName,
          email: item.row.email, jobTypeId: item.row.jobTypeId,
          unitMemberships: { create: item.row.unitIds.map((unitId, index) => ({ unitId, isPrimary: index === 0 })) },
        },
      });
      credentials.push({ badgeNumber: user.badgeNumber, temporaryPassword: item.password });
    }
    await recordAuditEvent({
      hospitalId: admin.hospitalId, actorId: admin.id, action: "USERS_BULK_IMPORTED",
      resourceType: "User", metadata: { count: rows.length },
    }, tx);
    return credentials;
  });
  return created;
}

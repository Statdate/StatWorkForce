import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { durationHours, scheduledHoursInWindow, workWeek } from "@/lib/scheduling-rules";
import { CREDENTIAL_TYPE_LABELS } from "@/lib/credential-types";

type TransactionClient = Prisma.TransactionClient;

export async function withSchedulingTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      const retryable = typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Could not complete scheduling transaction");
}

export async function checkAssignmentSafety(
  tx: TransactionClient,
  { userId, shiftId }: { userId: string; shiftId: string }
) {
  const [shift, worker] = await Promise.all([
    tx.shift.findUnique({
      where: { id: shiftId },
      select: {
        id: true,
        jobTypeId: true,
        startTime: true,
        endTime: true,
        requiredCount: true,
        jobType: { select: { requiredCredentialTypes: true } },
      },
    }),
    tx.user.findUnique({
      where: { id: userId },
      select: {
        jobTypeId: true,
        isActive: true,
        hospital: { select: { timeZone: true, weekStartsOn: true, weeklyHoursWarning: true } },
      },
    }),
  ]);
  if (!shift) throw new Error("Shift not found");
  if (!worker?.isActive) throw new Error("Worker account is inactive");
  if (!worker.jobTypeId || worker.jobTypeId !== shift.jobTypeId) {
    throw new Error("This worker does not have the job qualification required for this shift");
  }
  if (shift.jobType.requiredCredentialTypes.length > 0) {
    const credentials = await tx.credential.findMany({
      where: {
        userId,
        type: { in: shift.jobType.requiredCredentialTypes },
        expirationDate: { gte: shift.endTime },
      },
      select: { type: true },
    });
    const currentTypes = new Set(credentials.map(({ type }) => type));
    const missing = shift.jobType.requiredCredentialTypes.filter((type) => !currentTypes.has(type));
    if (missing.length > 0) {
      throw new Error(
        `Missing or expired required credential: ${missing.map((type) => CREDENTIAL_TYPE_LABELS[type]).join(", ")}`
      );
    }
  }
  if (shift.endTime <= shift.startTime) throw new Error("This shift has an invalid time range");
  if (shift.startTime <= new Date()) throw new Error("Past or already-started shifts cannot be assigned");

  const [overlap, filledCount] = await Promise.all([
    tx.scheduleAssignment.findFirst({
      where: {
        userId,
        status: { not: "DROPPED" },
        shiftId: { not: shiftId },
        shift: { startTime: { lt: shift.endTime }, endTime: { gt: shift.startTime } },
      },
      select: { shift: { select: { startTime: true, endTime: true } } },
    }),
    tx.scheduleAssignment.count({
      where: { shiftId, status: { not: "DROPPED" }, userId: { not: userId } },
    }),
  ]);
  if (overlap) {
    throw new Error(
      `This worker already has an overlapping shift (${overlap.shift.startTime.toLocaleString()} – ${overlap.shift.endTime.toLocaleString()})`
    );
  }
  if (filledCount >= shift.requiredCount) throw new Error("This shift is already fully staffed");

  const week = workWeek(
    shift.startTime,
    worker.hospital.timeZone,
    worker.hospital.weekStartsOn
  );
  const existing = await tx.scheduleAssignment.findMany({
    where: {
      userId,
      status: { not: "DROPPED" },
      shiftId: { not: shiftId },
      shift: { startTime: { lt: week.end }, endTime: { gt: week.start } },
    },
    select: { shift: { select: { startTime: true, endTime: true } } },
  });
  const existingHours = scheduledHoursInWindow(existing.map(({ shift: range }) => range), week);
  const projectedHours = existingHours + durationHours(shift);
  return {
    projectedHours,
    workloadWarning: projectedHours > worker.hospital.weeklyHoursWarning,
    workloadWarningThreshold: worker.hospital.weeklyHoursWarning,
  };
}

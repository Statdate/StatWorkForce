import "server-only";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { analyzeOperationalHealth } from "@/lib/operational-health";

export async function getOperationalHealth() {
  const admin = await requireRole("ADMIN");
  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const [shifts, failedPushDeliveries] = await Promise.all([
    prisma.shift.findMany({
      where: {
        unit: { hospitalId: admin.hospitalId },
        startTime: { gte: now, lt: horizon },
        schedulePeriod: { status: "PUBLISHED" },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        requiredCount: true,
        unit: { select: { name: true } },
        jobType: { select: { name: true, requiredCredentialTypes: true } },
        assignments: {
          where: { status: { not: "DROPPED" } },
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                credentials: { select: { type: true, expirationDate: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
      take: 500,
    }),
    prisma.notification.count({
      where: { user: { hospitalId: admin.hospitalId }, pushStatus: "FAILED" },
    }),
  ]);
  return {
    generatedAt: now,
    horizon,
    shiftLimitReached: shifts.length === 500,
    failedPushDeliveries,
    ...analyzeOperationalHealth(shifts),
  };
}

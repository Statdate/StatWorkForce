import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";

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

export async function getJobTypes() {
  await requireRole("ADMIN");
  return prisma.jobType.findMany({ orderBy: { name: "asc" } });
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

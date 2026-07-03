import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/** A worker only ever sees their own assignments/credentials — enforced by
 * always filtering on the verified session's userId, never a client-supplied id. */
export async function getMySchedule() {
  const user = await getCurrentUser();

  return prisma.scheduleAssignment.findMany({
    where: { userId: user.id, status: { not: "DROPPED" } },
    include: {
      shift: { include: { unit: true, jobType: true } },
    },
    orderBy: { shift: { startTime: "asc" } },
  });
}

export async function getMyCredentials() {
  const user = await getCurrentUser();

  return prisma.credential.findMany({
    where: { userId: user.id },
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

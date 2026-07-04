import { prisma } from "@/lib/prisma";

/**
 * One-time (idempotent) fixup to rename the seeded admin/manager to their
 * real names and add the two assistant-manager accounts, without re-running
 * prisma/seed.ts wholesale — that script isn't idempotent for shifts/
 * credentials/timecards (plain .create(), not upsert), so re-running it
 * against an already-seeded database would duplicate that data. This route
 * only touches the four identities and is safe to call more than once.
 *
 * Protected by the same CRON_SECRET as the credential-sweep cron — both are
 * machine-to-machine calls, not user sessions.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const admin = await prisma.user.findFirst({ where: { badgeNumber: "10001" } });
  const manager = await prisma.user.findFirst({ where: { badgeNumber: "20001" } });
  if (!admin || !manager) {
    return Response.json({ error: "Seeded admin/manager not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { firstName: "Kaiser", lastName: "" },
  });
  await prisma.user.update({
    where: { id: manager.id },
    data: { firstName: "Angela", lastName: "Allen" },
  });

  const icu = await prisma.unit.findFirst({
    where: { hospitalId: manager.hospitalId, name: "ICU" },
  });

  const assistantManagerSeeds = [
    { badgeNumber: "20002", firstName: "Brian", lastName: "Yu" },
    { badgeNumber: "20003", firstName: "Elline", lastName: "Williams" },
  ];

  const results = [];
  for (const seed of assistantManagerSeeds) {
    const user = await prisma.user.upsert({
      where: { hospitalId_badgeNumber: { hospitalId: manager.hospitalId, badgeNumber: seed.badgeNumber } },
      update: { firstName: seed.firstName, lastName: seed.lastName },
      create: {
        hospitalId: manager.hospitalId,
        accountType: "MANAGER",
        badgeNumber: seed.badgeNumber,
        passwordHash: manager.passwordHash,
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: `${seed.firstName.toLowerCase()}@statworkforce.test`,
        jobTypeId: manager.jobTypeId,
      },
    });

    if (icu) {
      await prisma.unitMembership.upsert({
        where: { userId_unitId: { userId: user.id, unitId: icu.id } },
        update: {},
        create: { userId: user.id, unitId: icu.id, isPrimary: true },
      });
    }

    results.push({ badgeNumber: user.badgeNumber, firstName: user.firstName, lastName: user.lastName });
  }

  return Response.json({
    ok: true,
    admin: { badgeNumber: admin.badgeNumber, firstName: "Kaiser", lastName: "" },
    manager: { badgeNumber: manager.badgeNumber, firstName: "Angela", lastName: "Allen" },
    assistantManagers: results,
  });
}

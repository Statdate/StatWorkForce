import { prisma } from "@/lib/prisma";

/**
 * One-time (idempotent) fixup for Angela Allen's real org structure — same
 * pattern and same CRON_SECRET as sync-seed-identities, split into its own
 * route since it's a distinct concern (org/unit structure vs. identity
 * renames). Safe to call more than once: every write here is an upsert.
 *
 * Renames the hospital, creates the Pre-op/PACU A/B/C/Bronch/GI units if
 * they don't exist, assigns Angela (ADA) and Brian/Elline (assistant ADA)
 * to them alongside their existing ICU membership (additive, not a
 * replacement), and seeds PACU A/B's weekday staffing shifts for the next
 * two weeks if a schedule period for that span doesn't already exist.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const manager = await prisma.user.findFirst({ where: { badgeNumber: "20001" } });
  if (!manager) {
    return Response.json({ error: "Seeded manager not found" }, { status: 404 });
  }

  const hospital = await prisma.hospital.update({
    where: { id: manager.hospitalId },
    data: { name: "Kaiser Los Angeles Medical Center" },
  });

  await prisma.user.update({ where: { id: manager.id }, data: { title: "ADA" } });
  const assistantManagers = await prisma.user.findMany({
    where: { hospitalId: hospital.id, badgeNumber: { in: ["20002", "20003"] } },
  });
  for (const m of assistantManagers) {
    await prisma.user.update({ where: { id: m.id }, data: { title: "Assistant ADA" } });
  }

  const unitSeeds: { name: string; type: "PRE_OP" | "PACU" | "OTHER" }[] = [
    { name: "Pre-op", type: "PRE_OP" },
    { name: "PACU A", type: "PACU" },
    { name: "PACU B", type: "PACU" },
    { name: "PACU C", type: "PACU" },
    { name: "Bronch", type: "OTHER" },
    { name: "GI", type: "OTHER" },
  ];
  const units = new Map<string, { id: string }>();
  for (const seed of unitSeeds) {
    const unit = await prisma.unit.upsert({
      where: { hospitalId_name: { hospitalId: hospital.id, name: seed.name } },
      update: {},
      create: { hospitalId: hospital.id, name: seed.name, type: seed.type },
    });
    units.set(seed.name, unit);
  }

  const preOpPacu = ["Pre-op", "PACU A", "PACU B", "PACU C"].map((name) => units.get(name)!);
  for (const m of [manager, ...assistantManagers]) {
    for (const unit of preOpPacu) {
      await prisma.unitMembership.upsert({
        where: { userId_unitId: { userId: m.id, unitId: unit.id } },
        update: {},
        create: { userId: m.id, unitId: unit.id, isPrimary: false },
      });
    }
  }
  for (const name of ["Bronch", "GI"]) {
    await prisma.unitMembership.upsert({
      where: { userId_unitId: { userId: manager.id, unitId: units.get(name)!.id } },
      update: {},
      create: { userId: manager.id, unitId: units.get(name)!.id, isPrimary: false },
    });
  }

  const rnJobType = await prisma.jobType.findFirst({ where: { name: "RN" } });
  const pacuA = units.get("PACU A")!;
  const pacuB = units.get("PACU B")!;
  const shiftsCreated: string[] = [];
  if (rnJobType) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const period = await prisma.schedulePeriod.upsert({
      where: { unitId_startDate_endDate: { unitId: pacuA.id, startDate, endDate } },
      update: {},
      create: { unitId: pacuA.id, startDate, endDate, status: "DRAFT" },
    });

    const existingPacuAShifts = await prisma.shift.count({ where: { unitId: pacuA.id, schedulePeriodId: period.id } });
    if (existingPacuAShifts === 0) {
      for (let day = 0; day < 14; day++) {
        const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
        if (date.getDay() === 0 || date.getDay() === 6) continue; // weekdays only

        const start = new Date(date);
        start.setHours(7, 0, 0, 0);
        const end = new Date(date);
        end.setHours(19, 0, 0, 0);

        await prisma.shift.create({
          data: {
            unitId: pacuA.id,
            schedulePeriodId: period.id,
            jobTypeId: rnJobType.id,
            startTime: start,
            endTime: end,
            requiredCount: 14,
          },
        });
        await prisma.shift.create({
          data: {
            unitId: pacuB.id,
            jobTypeId: rnJobType.id,
            startTime: start,
            endTime: end,
            requiredCount: 4,
          },
        });
      }
      shiftsCreated.push("PACU A/B weekday shifts for the next 14 days");
    }
  }

  return Response.json({
    ok: true,
    hospital: hospital.name,
    manager: { badgeNumber: manager.badgeNumber, title: "ADA" },
    assistantManagers: assistantManagers.map((m) => ({ badgeNumber: m.badgeNumber, title: "Assistant ADA" })),
    units: unitSeeds.map((u) => u.name),
    shiftsCreated,
  });
}

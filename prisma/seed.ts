import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = "Password123!";

const JOB_TYPES = [
  { name: "RN", category: "Nursing" },
  { name: "LPN", category: "Nursing" },
  { name: "CNA", category: "Nursing" },
  { name: "RT", category: "Respiratory Therapy" },
  { name: "Unit Clerk", category: "Support" },
];

const UNITS: { name: string; type: "ICU" | "MED_SURG" | "ED" | "PACU" | "LABOR_DELIVERY" | "OR" | "NICU" }[] = [
  { name: "ICU", type: "ICU" },
  { name: "Med-Surg", type: "MED_SURG" },
  { name: "Emergency Department", type: "ED" },
  { name: "PACU", type: "PACU" },
  { name: "Labor & Delivery", type: "LABOR_DELIVERY" },
  { name: "OR", type: "OR" },
  { name: "NICU", type: "NICU" },
];

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function shiftTimeOnDay(days: number, hour: number) {
  const date = daysFromNow(days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const hospital = await prisma.hospital.upsert({
    where: { id: "seed-hospital" },
    update: {},
    create: { id: "seed-hospital", name: "Riverside General Hospital" },
  });

  const jobTypes = await Promise.all(
    JOB_TYPES.map((jt) =>
      prisma.jobType.upsert({ where: { name: jt.name }, update: {}, create: jt })
    )
  );
  const rnJobType = jobTypes.find((jt) => jt.name === "RN")!;

  const units = await Promise.all(
    UNITS.map((unit) =>
      prisma.unit.upsert({
        where: { hospitalId_name: { hospitalId: hospital.id, name: unit.name } },
        update: {},
        create: { hospitalId: hospital.id, name: unit.name, type: unit.type },
      })
    )
  );
  const icu = units.find((u) => u.name === "ICU")!;
  const edUnit = units.find((u) => u.name === "Emergency Department")!;

  const admin = await prisma.user.upsert({
    where: { hospitalId_badgeNumber: { hospitalId: hospital.id, badgeNumber: "10001" } },
    update: { firstName: "Kaiser", lastName: "" },
    create: {
      hospitalId: hospital.id,
      accountType: "ADMIN",
      badgeNumber: "10001",
      passwordHash,
      firstName: "Kaiser",
      lastName: "",
      email: "admin@statworkforce.test",
    },
  });

  const manager = await prisma.user.upsert({
    where: { hospitalId_badgeNumber: { hospitalId: hospital.id, badgeNumber: "20001" } },
    update: { firstName: "Angela", lastName: "Allen" },
    create: {
      hospitalId: hospital.id,
      accountType: "MANAGER",
      badgeNumber: "20001",
      passwordHash,
      firstName: "Angela",
      lastName: "Allen",
      email: "manager@statworkforce.test",
      jobTypeId: rnJobType.id,
    },
  });

  // Assistant managers — same MANAGER accountType and unit as the manager
  // above; there's no separate "assistant" role in the schema yet, so this
  // is two more full MANAGER accounts co-assigned to ICU.
  const assistantManagerSeeds = [
    { badgeNumber: "20002", firstName: "Brian", lastName: "Yu" },
    { badgeNumber: "20003", firstName: "Elline", lastName: "Williams" },
  ];
  const assistantManagers = await Promise.all(
    assistantManagerSeeds.map((m) =>
      prisma.user.upsert({
        where: { hospitalId_badgeNumber: { hospitalId: hospital.id, badgeNumber: m.badgeNumber } },
        update: { firstName: m.firstName, lastName: m.lastName },
        create: {
          hospitalId: hospital.id,
          accountType: "MANAGER",
          badgeNumber: m.badgeNumber,
          passwordHash,
          firstName: m.firstName,
          lastName: m.lastName,
          email: `${m.firstName.toLowerCase()}@statworkforce.test`,
          jobTypeId: rnJobType.id,
        },
      })
    )
  );

  const workerSeeds = [
    { badgeNumber: "30001", firstName: "Jamie", lastName: "Nurse" },
    { badgeNumber: "30002", firstName: "Taylor", lastName: "Rivera" },
    { badgeNumber: "30003", firstName: "Casey", lastName: "Kim" },
    { badgeNumber: "30004", firstName: "Sam", lastName: "Patel" },
  ];

  const workers = await Promise.all(
    workerSeeds.map((w) =>
      prisma.user.upsert({
        where: { hospitalId_badgeNumber: { hospitalId: hospital.id, badgeNumber: w.badgeNumber } },
        update: {},
        create: {
          hospitalId: hospital.id,
          accountType: "WORKER",
          badgeNumber: w.badgeNumber,
          passwordHash,
          firstName: w.firstName,
          lastName: w.lastName,
          email: `${w.firstName.toLowerCase()}@statworkforce.test`,
          jobTypeId: rnJobType.id,
        },
      })
    )
  );

  // Manager + assistant managers all assigned to ICU (their scoped unit).
  await Promise.all(
    [manager, ...assistantManagers].map((m) =>
      prisma.unitMembership.upsert({
        where: { userId_unitId: { userId: m.id, unitId: icu.id } },
        update: {},
        create: { userId: m.id, unitId: icu.id, isPrimary: true },
      })
    )
  );

  const priorityTiers = await Promise.all(
    [
      { name: "Tier 1 — Full-time", rank: 1 },
      { name: "Tier 2 — Part-time", rank: 2 },
      { name: "Tier 3 — PRN", rank: 3 },
    ].map((tier) =>
      prisma.priorityGroup.upsert({
        where: { unitId_rank: { unitId: icu.id, rank: tier.rank } },
        update: {},
        create: { unitId: icu.id, name: tier.name, rank: tier.rank },
      })
    )
  );

  // Workers assigned to ICU, spread across priority tiers.
  await Promise.all(
    workers.map((worker, i) =>
      prisma.unitMembership.upsert({
        where: { userId_unitId: { userId: worker.id, unitId: icu.id } },
        update: {},
        create: {
          userId: worker.id,
          unitId: icu.id,
          isPrimary: true,
          priorityGroupId: priorityTiers[i % priorityTiers.length].id,
        },
      })
    )
  );

  // A draft schedule period covering the next two weeks, with a handful of shifts.
  const schedulePeriod = await prisma.schedulePeriod.upsert({
    where: {
      unitId_startDate_endDate: {
        unitId: icu.id,
        startDate: daysFromNow(0),
        endDate: daysFromNow(14),
      },
    },
    update: {},
    create: {
      unitId: icu.id,
      startDate: daysFromNow(0),
      endDate: daysFromNow(14),
      status: "DRAFT",
    },
  });

  for (let day = 1; day <= 5; day++) {
    const shift = await prisma.shift.create({
      data: {
        unitId: icu.id,
        schedulePeriodId: schedulePeriod.id,
        jobTypeId: rnJobType.id,
        startTime: shiftTimeOnDay(day, 7),
        endTime: shiftTimeOnDay(day, 19),
        requiredCount: 3,
      },
    });

    // Deliberately understaff a couple of shifts so the census view has
    // something to highlight.
    const assignedWorkers = day <= 2 ? workers.slice(0, 1) : workers.slice(0, 3);
    await Promise.all(
      assignedWorkers.map((worker) =>
        prisma.scheduleAssignment.create({
          data: {
            shiftId: shift.id,
            userId: worker.id,
            status: "SELF_SCHEDULED",
          },
        })
      )
    );
  }

  // Sample credentials: one expired, one expiring soon, one healthy.
  await prisma.credential.createMany({
    data: [
      {
        userId: workers[0].id,
        type: "BLS",
        issuingBody: "American Heart Association",
        expirationDate: daysFromNow(-10),
      },
      {
        userId: workers[0].id,
        type: "ACLS",
        issuingBody: "American Heart Association",
        expirationDate: daysFromNow(30),
      },
      {
        userId: workers[1].id,
        type: "RN_LICENSE",
        issuingBody: "State Board of Nursing",
        expirationDate: daysFromNow(400),
      },
    ],
    skipDuplicates: true,
  });

  // A pending timecard entry for the manager's approval queue.
  await prisma.timeEntry.create({
    data: {
      userId: workers[0].id,
      type: "CLOCK_IN",
      source: "APP",
      timestamp: daysFromNow(-1),
      approvalStatus: "PENDING",
    },
  });

  // A sample open call-in for the admin's oversight view.
  const firstShift = await prisma.shift.findFirst({ where: { unitId: icu.id } });
  if (firstShift) {
    await prisma.callIn.create({
      data: {
        shiftId: firstShift.id,
        reportedById: workers[2].id,
        reason: "Family emergency",
        status: "OPEN",
      },
    });
  }

  // A worker in the ED with no manager relationship, to prove unit-scoping.
  await prisma.unitMembership.upsert({
    where: { userId_unitId: { userId: workers[3].id, unitId: edUnit.id } },
    update: {},
    create: { userId: workers[3].id, unitId: edUnit.id, isPrimary: true },
  });

  console.log("Seed complete.");
  console.log(`Hospital: ${hospital.name}`);
  console.log(`Login for every seeded user: password "${SEED_PASSWORD}"`);
  console.log(`  Admin   — badge ${admin.badgeNumber}`);
  console.log(`  Manager — badge ${manager.badgeNumber} (ICU)`);
  assistantManagers.forEach((m) =>
    console.log(`  Asst Mgr— badge ${m.badgeNumber} (${m.firstName} ${m.lastName}, ICU)`)
  );
  workers.forEach((w) => console.log(`  Worker  — badge ${w.badgeNumber} (${w.firstName} ${w.lastName})`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

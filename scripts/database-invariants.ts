import assert from "node:assert/strict";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function expectDatabaseRejection(operation: () => Promise<unknown>, label: string) {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, `${label} should be rejected by the database`);
}

async function main() {
try {
  const mainHospital = await prisma.hospital.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const mainUser = await prisma.user.findFirstOrThrow({
    where: { hospitalId: mainHospital.id },
    orderBy: { createdAt: "asc" },
  });

  const suffix = `${process.pid}-${Date.now()}`;
  const otherHospital = await prisma.hospital.create({
    data: { code: `invariant-${suffix}`, name: "Invariant Test Hospital" },
  });

  try {
    const foreignUnit = await prisma.unit.create({
      data: { hospitalId: otherHospital.id, name: "Invariant Unit" },
    });
    await expectDatabaseRejection(
      () =>
        prisma.unitMembership.create({
          data: { userId: mainUser.id, unitId: foreignUnit.id },
        }),
      "cross-hospital unit membership"
    );

    const foreignJobType = await prisma.jobType.create({
      data: { hospitalId: otherHospital.id, name: "Invariant Job Type" },
    });
    await expectDatabaseRejection(
      () =>
        prisma.user.update({
          where: { id: mainUser.id },
          data: { jobTypeId: foreignJobType.id },
        }),
      "cross-hospital user job type"
    );
  } finally {
    await prisma.hospital.delete({ where: { id: otherHospital.id } });
  }

  const auditLog = await prisma.auditLog.findFirst({
    where: { hospitalId: mainHospital.id },
    orderBy: { occurredAt: "asc" },
  });
  assert.ok(auditLog, "the production smoke test should create at least one audit event");
  await expectDatabaseRejection(
    () =>
      prisma.auditLog.update({
        where: { id: auditLog.id },
        data: { outcome: "MUTATION_SHOULD_FAIL" },
      }),
    "audit log update"
  );
  await expectDatabaseRejection(
    () => prisma.auditLog.delete({ where: { id: auditLog.id } }),
    "audit log deletion"
  );

  await expectDatabaseRejection(
    () =>
      prisma.hospital.update({
        where: { id: mainHospital.id },
        data: { weekStartsOn: 7 },
      }),
    "invalid scheduling week start"
  );

  console.log(
    "Database invariants passed (tenant membership, tenant job type, immutable audit, scheduling constraints)."
  );
} finally {
  await prisma.$disconnect();
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Database invariant test failed");
  process.exitCode = 1;
});

-- AlterTable
ALTER TABLE "SchedulePeriod" ADD COLUMN "requestsOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ScheduleRequest" (
    "id" TEXT NOT NULL,
    "schedulePeriodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedDates" TIMESTAMP(3)[],
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRequest_schedulePeriodId_userId_key" ON "ScheduleRequest"("schedulePeriodId", "userId");

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_schedulePeriodId_fkey" FOREIGN KEY ("schedulePeriodId") REFERENCES "SchedulePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRequest" ADD CONSTRAINT "ScheduleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

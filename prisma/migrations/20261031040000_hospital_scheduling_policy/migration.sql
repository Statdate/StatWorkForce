ALTER TABLE "Hospital"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
ADD COLUMN "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "weeklyHoursWarning" DOUBLE PRECISION NOT NULL DEFAULT 40;

ALTER TABLE "Hospital"
ADD CONSTRAINT "Hospital_weekStartsOn_check" CHECK ("weekStartsOn" BETWEEN 0 AND 6),
ADD CONSTRAINT "Hospital_weeklyHoursWarning_check" CHECK ("weeklyHoursWarning" > 0 AND "weeklyHoursWarning" <= 168);

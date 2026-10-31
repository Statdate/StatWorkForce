CREATE TYPE "PushDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "Notification"
ADD COLUMN "pushStatus" "PushDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "pushAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pushNextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "pushLockedAt" TIMESTAMP(3),
ADD COLUMN "pushDeliveredAt" TIMESTAMP(3),
ADD COLUMN "pushTicketId" TEXT,
ADD COLUMN "pushLastError" TEXT;

CREATE INDEX "Notification_pushStatus_pushNextAttemptAt_idx"
ON "Notification"("pushStatus", "pushNextAttemptAt");

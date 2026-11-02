CREATE TABLE "LoginThrottle" (
    "keyHash" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

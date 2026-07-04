-- Add PRE_OP as a unit type (Kaiser LA's Pre-op unit).
ALTER TYPE "UnitType" ADD VALUE 'PRE_OP';

-- Add OTHER as a time-off type, paired with the existing `reason` field
-- acting as the required comment box when this is selected.
ALTER TYPE "TimeOffType" ADD VALUE 'OTHER';

-- Org title (e.g. "ADA" / "Assistant ADA") and a free-text description of
-- the worker's typically-assigned shift pattern, shown on their Settings
-- profile.
ALTER TABLE "User" ADD COLUMN "title" TEXT;
ALTER TABLE "User" ADD COLUMN "shiftPattern" TEXT;
